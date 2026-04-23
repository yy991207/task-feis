import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testTaskRowDoesNotRenderPlusOrMoreActions() {
  const source = await readTaskTableSource()
  const taskRowStart = source.indexOf('function TaskTitleCell(')
  const taskRowEnd = source.indexOf('function formatCustomFieldValue(')
  const taskRowSource = source.slice(taskRowStart, taskRowEnd)

  assert.doesNotMatch(
    taskRowSource,
    /className="cell cell-more"[\s\S]*icon={<PlusOutlined \/>}/,
    '每个任务行右侧不应该再渲染加号按钮',
  )
  assert.doesNotMatch(
    taskRowSource,
    /className="task-row-more-btn"/,
    '每个任务行右侧不应该再渲染三点菜单按钮',
  )
}

async function testTaskRowUsesBlankHotspotToOpenDetail() {
  const source = await readTaskTableSource()
  const taskRowStart = source.indexOf('function TaskTitleCell(')
  const taskRowEnd = source.indexOf('function formatCustomFieldValue(')
  const taskRowSource = source.slice(taskRowStart, taskRowEnd)

  assert.doesNotMatch(
    taskRowSource,
    /className="task-detail-btn"[\s\S]*>\s*详情\s*<\/Button>/,
    '任务标题区域不应该再渲染“详情”按钮',
  )
  assert.match(
    taskRowSource,
    /className="task-detail-hotspot"[\s\S]*onClick=\{\(e\) => \{[\s\S]*e\.stopPropagation\(\)[\s\S]*onOpenDetail\(\)/,
    '任务标题后面应该保留一个独立的空白热区，点击后只打开详情面板',
  )
}

async function testTaskRowBlankAreaUsesOnRowToOpenDetail() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /onRow=\{\(record\) => \{[\s\S]*if \(!isTaskTableTaskRow\(record\)\) \{[\s\S]*return \{\}[\s\S]*onClick: \(\) => onTaskClick\(record\)/,
    '任务行应该在 onRow 里统一处理点击，这样整条任务上的空白区域都能打开详情',
  )
  assert.match(
    source,
    /<div className="cell cell-priority" onClick=\{\(e\) => e\.stopPropagation\(\)\}>/,
    '优先级等交互控件要继续拦截冒泡，避免改成整行可点后误打开详情',
  )
}

async function testTaskTableSpacerCellDoesNotDisableRowClick() {
  const source = await readTaskTableSource()
  const styleSource = await readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')

  assert.match(
    source,
    /key: 'tableLayoutSpacer'[\s\S]*className: 'task-table-spacer-cell'/,
    '任务表格要保留右侧补白列，用来撑满剩余宽度',
  )
  assert.doesNotMatch(
    styleSource,
    /\.task-table-spacer-cell\s*\{[\s\S]*pointer-events:\s*none;/,
    '右侧补白列不能再禁用 pointer events，不然点击这块空白时行级 onClick 接不到事件',
  )
}

async function main() {
  await testTaskRowDoesNotRenderPlusOrMoreActions()
  await testTaskRowUsesBlankHotspotToOpenDetail()
  await testTaskRowBlankAreaUsesOnRowToOpenDetail()
  await testTaskTableSpacerCellDoesNotDisableRowClick()
  console.log('task row actions regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
