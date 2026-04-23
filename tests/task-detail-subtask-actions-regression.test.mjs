import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskRowHasDedicatedDetailEntry() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const handleOpenSubtaskDetail = \(subtask: Task\) => \{/,
    '任务详情里的子任务列表应该有独立的详情打开函数，避免整行逻辑和按钮逻辑分散',
  )

  assert.match(
    source,
    /className="subtask-detail-btn"[\s\S]*?>\s*详情\s*<\/Button>/,
    '子任务行应该提供显式“详情”按钮，避免只能点整行猜交互',
  )
}

async function testSubtaskDueCanBeEditedInline() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const handleSubtaskDueChange = async \(subtask: Task, value: dayjs\.Dayjs \| null\) => \{/,
    '任务详情里的子任务应该提供独立的截止时间更新函数',
  )

  assert.match(
    source,
    /updateTaskApi\(subtask\.guid,\s*\{[\s\S]*due_date: value \? value\.toISOString\(\) : null,/,
    '子任务截止时间更新应该直接走任务更新接口，支持清空和重设',
  )

  assert.match(
    source,
    /title="设置子任务截止时间"[\s\S]*className="subtask-meta-trigger subtask-date-trigger"/,
    '子任务行应该提供显式的截止时间触发器，而不是只展示纯文本日期',
  )
}

async function testSubtaskAssigneeCanBeEditedInline() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const handleSubtaskAssigneeChange = async \(subtask: Task, values: string\[\]\) => \{/,
    '任务详情里的子任务应该提供独立的多负责人更新函数',
  )

  assert.match(
    source,
    /await patchTaskAssignee\(subtask\.guid, nextAssigneeIds\)/,
    '子任务负责人更新应该发送完整 assignee_ids 数组',
  )

  assert.match(
    source,
    /title="设置子任务负责人"[\s\S]*className="subtask-meta-trigger subtask-assignee-trigger"/,
    '子任务行应该提供显式的负责人触发器，而不是只展示头像',
  )
}

async function main() {
  await testSubtaskRowHasDedicatedDetailEntry()
  await testSubtaskDueCanBeEditedInline()
  await testSubtaskAssigneeCanBeEditedInline()
  console.log('task detail subtask actions regressions ok')
}

await main()
