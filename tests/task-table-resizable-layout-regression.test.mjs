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
    /title: 407,/,
    '任务标题列默认宽度应该使用当前截图中的 407px 显示宽度',
  )
  assert.match(
    source,
    /key: 'title'[\s\S]*width: 407,/,
    '任务标题列对象自身也应该声明 407px 默认宽度，避免和默认宽度映射不一致',
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

async function testNonTitleColumnsUseUnifiedDefaultWidth() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const MIN_COLUMN_WIDTH = 42/,
    '普通字段列最小拖拽宽度应该改成原来的一半',
  )
  assert.match(
    source,
    /const MIN_TITLE_COLUMN_WIDTH = 140/,
    '任务标题列最小拖拽宽度应该继续保持 140px，默认更宽但允许拖小',
  )
  assert.match(
    source,
    /const DEFAULT_COLUMN_WIDTH = 120/,
    '除任务标题外，普通字段默认显示宽度应该统一为适中宽度，能基本显示开始/截止时间',
  )
  assert.match(
    source,
    /const DEFAULT_CUSTOM_FIELD_COLUMN_WIDTH = DEFAULT_COLUMN_WIDTH/,
    '自定义字段默认显示宽度应该跟普通字段保持一致',
  )

  const widthMapMatch = source.match(
    /const DEFAULT_COLUMN_WIDTHS:[\s\S]*?= \{([\s\S]*?)\}\nconst MIN_COLUMN_WIDTH/,
  )
  assert.ok(widthMapMatch, '任务表格应该保留列宽默认值映射，方便标题列单独设置默认宽度')
  assert.doesNotMatch(
    widthMapMatch[1],
    /\n\s+(priority|assignee|estimate|start|due|creator|created|subtaskProgress|taskSource|assigner|followers|completed|updated|taskId|sourceCategory):\s+\d+/,
    '除任务标题外，普通字段默认宽度不应该再单独覆盖，应该统一使用默认字段宽度',
  )

  const nonTitleColumnWidthMatch = source.match(
    /key: '(priority|assignee|estimate|start|due|creator|created|subtaskProgress|taskSource|assigner|followers|completed|updated|taskId|sourceCategory)'[\s\S]{0,220}?width:\s+\d+/,
  )
  assert.equal(
    nonTitleColumnWidthMatch,
    null,
    '除任务标题和工具列外，普通字段列对象不应该再写单独 width，默认宽度应该统一从 DEFAULT_COLUMN_WIDTH 取得',
  )
}

async function testNarrowDefaultContentUsesEllipsis() {
  const style = await readTaskTableStyle()

  assert.match(
    style,
    /\.task-column-header-content\s*\{[\s\S]*text-overflow:\s*ellipsis;/,
    '字段表头默认宽度放不下完整标题时应该省略显示',
  )
  assert.match(
    style,
    /\.date-text\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/,
    '开始/截止时间默认宽度放不下完整日期时应该省略显示',
  )
  assert.match(
    style,
    /\.priority-tag[\s\S]*max-width:\s*100%[\s\S]*\.anticon[\s\S]*flex-shrink:\s*0;[\s\S]*span:not\(\.anticon\)[\s\S]*text-overflow:\s*ellipsis;/,
    '优先级标签默认宽度放不下完整内容时应该省略显示，图标不能被挤掉',
  )
  assert.match(
    style,
    /\.custom-field-value-tag[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/,
    '自定义字段标签默认宽度放不下完整内容时应该省略显示',
  )
}

async function testEllipsisContentUsesBlackTooltip() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /<Tooltip[\s\S]*title=\{getColumnTooltipTitle\(children\)\}[\s\S]*color="#000"[\s\S]*overlayInnerStyle=\{\{ color: '#fff' \}\}[\s\S]*<span className="task-column-header-content">\{children\}<\/span>[\s\S]*<\/Tooltip>/,
    '字段表头默认宽度放不下完整标题时，鼠标滑过应该用黑底白字浮窗显示完整标题',
  )
  assert.match(
    source,
    /function renderOverflowTooltip\([\s\S]*color="#000"[\s\S]*overlayInnerStyle=\{\{ color: '#fff' \}\}/,
    '表格省略文本应该统一使用黑底白字 Tooltip',
  )
  assert.match(
    source,
    /renderOverflowTooltip\(displayValue, <span className="custom-field-text">\{displayValue\}<\/span>\)/,
    '自定义字段文本值省略时应该悬浮显示完整值',
  )
  assert.match(
    source,
    /renderOverflowTooltip\(\s*PriorityLabel\[task\.priority\],[\s\S]*<span>\{PriorityLabel\[task\.priority\]\}<\/span>/,
    '优先级标签省略时应该悬浮显示完整优先级文案',
  )
  assert.match(
    source,
    /renderOverflowTooltip\(date\.format\('M月D日'\), <span className="date-text">\{date\.format\('M月D日'\)\}<\/span>\)/,
    '开始/截止日期省略时应该悬浮显示完整日期',
  )
  assert.match(
    source,
    /renderOverflowTooltip\(\s*label,[\s\S]*<Tag[\s\S]*\{label\}[\s\S]*<\/Tag>/,
    '自定义字段标签值省略时应该悬浮显示完整标签',
  )
  assert.match(
    source,
    /function getTooltipTextFromNode\([\s\S]*isValidElement[\s\S]*node\.props\.children/,
    '表头 Tooltip 应该能从嵌套节点里提取完整文案，覆盖带图标表头和自定义字段表头',
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
  await testNonTitleColumnsUseUnifiedDefaultWidth()
  await testNarrowDefaultContentUsesEllipsis()
  await testEllipsisContentUsesBlackTooltip()
  await testColumnsCanResizeFromAntdHeaderCell()
  await testResizeHandleHasVisibleHitArea()
  console.log('task table resizable layout regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
