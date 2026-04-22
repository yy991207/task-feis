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
    /className=\{`task-row[\s\S]*onClick=\{onClick\}/,
    '任务行根节点不应该再绑定整行点击打开详情，避免点到空白区域误触',
  )
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

async function main() {
  await testTaskRowDoesNotRenderPlusOrMoreActions()
  await testTaskRowUsesBlankHotspotToOpenDetail()
  console.log('task row actions regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
