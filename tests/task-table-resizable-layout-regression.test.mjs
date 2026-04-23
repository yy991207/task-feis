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
    /title: 140,/,
    '任务标题列默认宽度应该直接等于当前最小宽度，避免左侧固定区默认占用过多空间',
  )
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
  assert.match(
    source,
    /key: 'tableLayoutSpacer'/,
    '任务表格应该补一个专门吸收剩余宽度的占位列，避免整张表只按最小宽度显示',
  )
}

async function testColumnMinimumWidthUsesHalfSize() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const MIN_COLUMN_WIDTH = 42/,
    '普通字段列最小拖拽宽度应该改成原来的一半',
  )
  assert.match(
    source,
    /const MIN_TITLE_COLUMN_WIDTH = 140/,
    '任务标题列最小拖拽宽度应该改成原来的一半',
  )
  assert.match(
    source,
    /const DEFAULT_COLUMN_WIDTH = 42/,
    '普通字段默认显示宽度应该直接使用当前最小宽度，避免初始状态过宽',
  )
  assert.match(
    source,
    /const DEFAULT_CUSTOM_FIELD_COLUMN_WIDTH = 42/,
    '自定义字段默认显示宽度也应该直接使用当前最小宽度',
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
    /onHeaderCell: \(\) => \(\{[\s\S]*columnKey,[\s\S]*width: getColumnWidth\(columnKey\),[\s\S]*onResize: handleColumnResize/,
    '可拖拽列包装函数应该通过 onHeaderCell 传入列标识、当前宽度和拖拽回调',
  )
  assert.match(
    source,
    /taskColumns\.push\(withResizableHeader\(\{[\s\S]*key: 'priority'[\s\S]*\}, 'priority'\)\)/,
    '普通字段列应该接入可拖拽列包装函数',
  )
  assert.match(
    source,
    /taskColumns\.push\(withResizableHeader\(\{[\s\S]*key: columnKey[\s\S]*\}, columnKey\)\)/,
    '自定义字段列也应该接入可拖拽列包装函数',
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
  assert.doesNotMatch(
    style,
    /\.ant-table-content table\s*\{[\s\S]*min-width: 0 !important;/,
    '任务表格不应该继续把内部 table 压成最小宽度显示',
  )
  assert.match(
    style,
    /\.task-table-spacer-cell/,
    '剩余宽度占位列应该有单独样式类，方便把多出来的空间稳定留在占位列里',
  )
}

async function main() {
  await testTitleColumnFixedAndRightFieldsScrollable()
  await testColumnMinimumWidthUsesHalfSize()
  await testColumnsCanResizeFromAntdHeaderCell()
  await testResizeHandleHasVisibleHitArea()
  console.log('task table resizable layout regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
