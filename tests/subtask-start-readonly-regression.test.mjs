import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testDetailPanelKeepsSubtaskStartReadonly() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const isSubtask = Boolean\(task\.parent_task_guid\)/,
    '任务详情应该用 parent_task_guid 判断当前任务是不是子任务',
  )
  assert.match(
    source,
    /if \(field === 'start' && isSubtask\)/,
    '任务详情更新日期时应该防御式拦截子任务开始时间修改',
  )
  assert.match(
    source,
    /isSubtask \? \([^]*?date-tag-readonly[^]*?Popover/s,
    '任务详情里的子任务开始时间应该只展示，不应该包在可点击 Popover 里',
  )
}

async function testTaskTableKeepsSubtaskStartReadonly() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /const isSubtask = Boolean\(task\.parent_task_guid\)/,
    '任务表格行应该用 parent_task_guid 判断当前任务是不是子任务',
  )
  assert.match(
    source,
    /if \(field === 'start' && isSubtask\)/,
    '任务表格行更新日期时应该防御式拦截子任务开始时间修改',
  )
  assert.match(
    source,
    /isSubtask \? \([^]*?date-trigger-readonly[^]*?Popover/s,
    '任务表格行里的子任务开始时间应该只展示，不应该包在可点击 Popover 里',
  )
}

async function main() {
  await testDetailPanelKeepsSubtaskStartReadonly()
  await testTaskTableKeepsSubtaskStartReadonly()
  console.log('subtask start readonly regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
