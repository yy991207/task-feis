import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTypesSource() {
  return readFile(new URL('../src/types/task.ts', import.meta.url), 'utf8')
}

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyleSource() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function readCustomFieldEditorModalSource() {
  return readFile(
    new URL('../src/components/CustomFieldEditorModal/index.tsx', import.meta.url),
    'utf8',
  )
}

async function testSelectOptionKeepsDisabledMetadata() {
  const source = await readTaskTypesSource()

  assert.match(
    source,
    /export interface SelectOption \{[\s\S]*color\?: string \| null[\s\S]*is_disabled\?: boolean[\s\S]*disabled_at\?: string \| null/,
    '自定义字段选项类型应该保留 color、is_disabled、disabled_at，展示历史停用值时需要这些元信息',
  )
}

async function testApiMappingKeepsDisabledOptions() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /options: \(f\.options \?\? \[\]\)\.map\(\(o\) => \(\{[\s\S]*guid: o\.value[\s\S]*name: o\.label[\s\S]*color: o\.color[\s\S]*is_disabled: o\.is_disabled[\s\S]*disabled_at: o\.disabled_at/,
    '接口字段映射到表格字段定义时，不能丢掉停用选项和颜色信息',
  )
}

async function testDisabledOptionsStayVisibleButNotSelectable() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /function buildSelectableCustomFieldOptions\(field: CustomFieldDef, selectedValues: string\[\]\)[\s\S]*!option\.is_disabled \|\| selectedValueSet\.has\(option\.guid\)[\s\S]*disabled: option\.is_disabled === true/,
    '编辑态下拉应该只补回当前任务已选中的停用选项，并禁用该历史选项',
  )
  assert.match(
    source,
    /function renderSelectOptionLabel\([\s\S]*custom-field-disabled-option-label/,
    '当前已选中的停用选项在下拉中也应该显示删除线标签，不能显示英文 value',
  )
  assert.match(
    source,
    /function renderSelectFieldTags\([\s\S]*custom-field-value-tag-disabled/,
    '自定义字段展示态应该能把已引用的停用选项渲染成专门的禁用标签样式',
  )
  assert.match(
    source,
    /renderSelectFieldTags\(field, selectedSingleValues\)/,
    '单选字段展示态应该用选项元信息渲染标签，而不是只显示纯文本',
  )
  assert.match(
    source,
    /renderSelectFieldTags\(field, multiValue\)/,
    '多选字段展示态应该逐项渲染标签，保留停用项的历史展示',
  )
  assert.match(
    source,
    /options=\{buildSelectableCustomFieldOptions\(field, selectedSingleValues\)\}/,
    '单选编辑下拉应该把当前已选中的停用选项补进 options，避免显示原始 value',
  )
  assert.match(
    source,
    /options=\{buildSelectableCustomFieldOptions\(field, multiValue\)\}/,
    '多选编辑下拉应该把当前已选中的停用选项补进 options，避免刷新后丢失历史值',
  )
}

async function testDisabledOptionStyleExists() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.custom-field-value-tag-disabled \{[\s\S]*text-decoration: line-through/,
    '停用选项标签应该有删除线样式，表达该历史选项已经不可继续使用',
  )
  assert.match(
    source,
    /\.custom-field-disabled-option-label \{[\s\S]*text-decoration: line-through/,
    '下拉里的历史停用选项也应该有删除线样式，避免只显示英文 value',
  )
}

async function testEditorModalHidesDisabledOptions() {
  const source = await readCustomFieldEditorModalSource()

  assert.match(
    source,
    /function getEnabledFieldOptions\(field\?: ApiCustomField \| null\): FieldOption\[\] \{[\s\S]*!\(option\.is_disabled === true\)/,
    '编辑自定义字段弹窗应该统一过滤 is_disabled=true 的历史选项',
  )
  assert.match(
    source,
    /useState<FieldOption\[\]>\(\(\) => getEnabledFieldOptions\(field\)\)/,
    '编辑弹窗初始化选项列表时不应该显示停用选项',
  )
  assert.match(
    source,
    /setOptions\(getEnabledFieldOptions\(field\)\)/,
    '编辑弹窗重新打开或切换字段时，也应该过滤停用选项',
  )
}

async function main() {
  await testSelectOptionKeepsDisabledMetadata()
  await testApiMappingKeepsDisabledOptions()
  await testDisabledOptionsStayVisibleButNotSelectable()
  await testDisabledOptionStyleExists()
  await testEditorModalHidesDisabledOptions()
  console.log('custom field disabled options regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
