import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyle() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testCustomFieldCellUsesReadModeTrigger() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const \[editing, setEditing\] = useState\(false\)/,
    '自定义字段单元格应该区分默认展示态和编辑态，避免一直像未保存输入框',
  )
  assert.match(
    source,
    /className="custom-field-trigger"/,
    '自定义字段默认态应该有统一触发器样式，和优先级/日期这类列保持一致',
  )
  assert.match(
    source,
    /function renderSelectFieldTags\([\s\S]*<Tag[\s\S]*custom-field-value-tag/,
    '单选类自定义字段在已填写时应该用 antd Tag 展示已保存值',
  )
  assert.match(
    source,
    /className="custom-field-placeholder"/,
    '自定义字段未填写时应该有明确空态占位，而不是一直显示编辑控件',
  )
}

async function testCustomFieldStyleHasSavedStateVisuals() {
  const style = await readTaskTableStyle()

  assert.match(
    style,
    /\.custom-field-trigger \{/,
    '自定义字段应该有统一触发器容器样式',
  )
  assert.match(
    style,
    /\.custom-field-value-tag \{/,
    '自定义字段已保存值应该有单独的标签样式',
  )
  assert.match(
    style,
    /\.custom-field-placeholder \{/,
    '自定义字段空态应该有单独的占位样式',
  )
  assert.match(
    style,
    /\.custom-field-editor \{/,
    '自定义字段进入编辑态后应该有独立编辑器容器样式',
  )
}

async function testCustomFieldEditorUsesAdaptiveWidth() {
  const source = await readTaskTableSource()
  const style = await readTaskTableStyle()

  assert.match(
    source,
    /className="custom-field-editor custom-field-editor-text"/,
    '文本类自定义字段编辑态需要有专用类名，方便做自适应宽度',
  )
  assert.match(
    source,
    /className="custom-field-editor custom-field-editor-number"/,
    '数字类自定义字段编辑态需要有专用类名，方便控制短输入宽度',
  )
  assert.match(
    source,
    /className="custom-field-editor custom-field-editor-date"/,
    '日期类自定义字段编辑态需要有专用类名，避免日期框铺满整列',
  )
  assert.match(
    source,
    /className="custom-field-editor custom-field-editor-select"/,
    '选择类自定义字段编辑态需要有专用类名，避免选择框铺满整列',
  )
  assert.match(
    style,
    /\.custom-field-editor \{[\s\S]*width: fit-content;[\s\S]*max-width: 100%;/,
    '自定义字段编辑容器应该按内容宽度展示，并限制最大宽度不撑破单元格',
  )
  assert.match(
    style,
    /\.custom-field-editor-text[\s\S]*field-sizing: content;/,
    '文本自定义字段输入框应该按输入内容自适应宽度',
  )
  assert.match(
    style,
    /\.custom-field-editor-number[\s\S]*field-sizing: content;/,
    '数字自定义字段输入框应该按输入内容自适应宽度',
  )
  assert.match(
    style,
    /\.custom-field-editor-date[\s\S]*\.ant-picker \{[\s\S]*width: 132px;/,
    '日期自定义字段编辑框应该使用固定短宽度，不要占满整列',
  )
  assert.match(
    style,
    /\.custom-field-editor-select[\s\S]*\.ant-select \{[\s\S]*width: min\(180px, 100%\);/,
    '选择类自定义字段编辑框应该使用较短宽度并保留单元格内最大宽度限制',
  )
}

async function main() {
  await testCustomFieldCellUsesReadModeTrigger()
  await testCustomFieldStyleHasSavedStateVisuals()
  await testCustomFieldEditorUsesAdaptiveWidth()
  console.log('custom field display style regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
