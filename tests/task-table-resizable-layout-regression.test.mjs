import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyle() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testTitleColumnFixedAndRightFieldsScrollable() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /fixed: 'left'/,
    '任务标题列应该固定在左侧，右侧字段横向滚动时左侧任务内容保持可见',
  )
  assert.match(
    source,
    /scroll=\{\{ x: tableScrollX \}\}/,
    '任务表格横向滚动宽度应该按当前列宽计算，避免拖拽后滚动区宽度不准',
  )
}

async function testColumnsCanResizeFromAntdHeaderCell() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /components=\{\{ header: \{ cell: ResizableHeaderCell \} \}\}/,
    '任务表格应该在当前 Antd Table 上替换 header cell 来支持列宽拖拽',
  )
  assert.match(
    source,
    /onHeaderCell: \(\) => \(\{[\s\S]*columnKey: '[^']+'[\s\S]*width: getColumnWidth\('[^']+'\)[\s\S]*onResize: handleColumnResize/,
    '每个字段列应该通过 onHeaderCell 传入列标识、当前宽度和拖拽回调',
  )
}

async function testResizeHandleHasVisibleHitArea() {
  const style = await readTaskTableStyle()

  assert.match(
    style,
    /\.task-column-resize-handle/,
    '表头应该提供可点击拖拽的列宽调整热区',
  )
  assert.match(
    style,
    /cursor: col-resize/,
    '列宽调整热区应该使用 col-resize 光标，明确告诉用户这里可以拖动',
  )
}

async function main() {
  await testTitleColumnFixedAndRightFieldsScrollable()
  await testColumnsCanResizeFromAntdHeaderCell()
  await testResizeHandleHasVisibleHitArea()
  console.log('task table resizable layout regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
