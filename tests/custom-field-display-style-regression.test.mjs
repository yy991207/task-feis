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
    /<Tag[\s\S]*className="custom-field-value-tag"/,
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

async function main() {
  await testCustomFieldCellUsesReadModeTrigger()
  await testCustomFieldStyleHasSavedStateVisuals()
  console.log('custom field display style regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
