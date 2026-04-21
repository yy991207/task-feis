import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testCreatedCustomFieldBecomesVisibleColumn() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const handleCustomFieldSaved = async \(field: ApiCustomField\)/,
    '新建自定义字段保存后应该有统一回调，不能只刷新字段列表',
  )
  assert.match(
    source,
    /handleAddVisibleColumn\(toCustomFieldColumnKey\(field\.field_id\)\)/,
    '新建自定义字段保存后应该自动加入当前表格可见列，用户才能继续配置字段值',
  )
  assert.match(
    source,
    /onSaved=\{\(field\) => void handleCustomFieldSaved\(field\)\}/,
    '自定义字段编辑弹窗保存成功后应该调用自动显示字段列的回调',
  )
}

async function testCustomFieldCellCanEditValues() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /import \{[\s\S]*patchTaskCustomFields[\s\S]*\} from '@\/services\/customFieldService'/,
    '任务表格应该调用自定义字段值保存接口，而不是只展示字段文本',
  )
  assert.match(
    source,
    /function CustomFieldCell\(/,
    '自定义字段列应该有独立单元格组件，负责按字段类型渲染编辑控件',
  )
  assert.match(
    source,
    /handleCustomFieldValueChange/,
    '自定义字段单元格变更后应该统一保存并同步本地任务状态',
  )
  assert.match(
    source,
    /<CustomFieldCell[\s\S]*field=\{field\}[\s\S]*onChange=\{\(value\) => void handleCustomFieldValueChange\(field, value\)\}/,
    '自定义字段列渲染时应该接入可编辑单元格，而不是只输出 formatCustomFieldValue 文本',
  )
}

async function testCustomFieldTypeMenuAnchorsInsidePanel() {
  const source = await readTaskTableSource()
  const panelStart = source.indexOf('const fieldConfigPanel = (')
  const panelEnd = source.indexOf('const createTaskInlineRow =')
  const panelSource = source.slice(panelStart, panelEnd)

  assert.doesNotMatch(
    panelSource,
    /<Dropdown[\s\S]*className="field-config-create-btn"/,
    '新建自定义字段类型菜单不应该挂在按钮自己的 Dropdown 上，否则浮层会贴着按钮展开',
  )
  assert.match(
    source,
    /const \[customFieldTypeMenuOpen, setCustomFieldTypeMenuOpen\] = useState\(false\)/,
    '字段配置面板应该自己维护字段类型菜单开关，才能把菜单固定在面板右侧',
  )
  assert.match(
    source,
    /field-config-side-panel field-config-type-menu/,
    '字段类型菜单应该作为字段配置面板内部的侧边区域渲染',
  )
  assert.match(
    source,
    /className="field-config-layout"/,
    '字段配置 UI 应该使用左右双列布局容器，复刻截图里的双层面板结构',
  )
  assert.match(
    source,
    /className="field-config-main-panel"/,
    '左侧字段列表应该有独立主面板容器',
  )
  assert.match(
    source,
    /field-config-side-panel field-config-type-menu/,
    '右侧字段类型列表应该有独立侧边面板容器',
  )
}

async function main() {
  await testCreatedCustomFieldBecomesVisibleColumn()
  await testCustomFieldCellCanEditValues()
  await testCustomFieldTypeMenuAnchorsInsidePanel()
  console.log('custom field configuration regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
