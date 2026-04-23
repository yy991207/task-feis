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
    /className="subtask-detail-btn"[\s\S]*aria-label="查看详情"/,
    '子任务行应该提供显式的箭头详情按钮，并保留 aria-label 说明用途',
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

  assert.match(
    source,
    /className="subtask-meta-trigger subtask-date-trigger"[\s\S]*>\s*\{dueDate \? `\$\{dueDate\.format\('M月D日'\)\} 截止` : null\}\s*<\/Button>/,
    '子任务已设置截止时间时，日期入口应该显示“目标时间 + 截止”的样式',
  )

  assert.match(
    source,
    /className="subtask-meta-trigger subtask-date-trigger"[\s\S]*icon=\{dueDate \? undefined : <CalendarOutlined \/>\}/,
    '子任务未设置截止时间时仍然应该保留日历图标入口，已设置日期后不再显示图标',
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
    /className="subtask-meta-trigger subtask-assignee-trigger"/,
    '子任务行应该提供显式的负责人触发器，而不是只展示头像',
  )

  assert.match(
    source,
    /className="subtask-meta-trigger subtask-assignee-trigger"[\s\S]*aria-label="设置子任务负责人"/,
    '子任务负责人入口去掉文字占位后，仍然应该保留 aria-label 说明按钮用途',
  )
}

async function testSubtaskMetaTriggersDoNotUseCapsuleBorder() {
  const source = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /\.subtask-meta-trigger\s*\{[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/,
    '子任务截止时间和负责人入口应该去掉外层胶囊边框，只保留内部 UI',
  )
  assert.doesNotMatch(
    source,
    /\.subtask-meta-trigger\s*\{[\s\S]*border-radius:\s*999px;[\s\S]*border:\s*1px solid #e5e6eb;/,
    '子任务截止时间和负责人入口不应该继续保留外层曲形边框',
  )
}

async function main() {
  await testSubtaskRowHasDedicatedDetailEntry()
  await testSubtaskDueCanBeEditedInline()
  await testSubtaskAssigneeCanBeEditedInline()
  await testSubtaskMetaTriggersDoNotUseCapsuleBorder()
  console.log('task detail subtask actions regressions ok')
}

await main()
