import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskAssigneeTriggerDoesNotUseGenericTooltip() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.doesNotMatch(
    source,
    /<Tooltip title="设置子任务负责人">[\s\S]*className="subtask-meta-trigger subtask-assignee-trigger"/,
    '子任务负责人入口不应该再显示通用的“设置子任务负责人”浮窗提示',
  )
}

async function testSubtaskAssigneeAvatarKeepsNameTooltip() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /<Tooltip key=\{assigneeUser\.id\} title=\{getUserDisplayName\(assigneeUser\)\}>/,
    '子任务负责人头像本身仍然应该保留姓名提示，避免完全看不到是谁',
  )
}

async function main() {
  await testSubtaskAssigneeTriggerDoesNotUseGenericTooltip()
  await testSubtaskAssigneeAvatarKeepsNameTooltip()
  console.log('task detail subtask assignee tooltip regressions ok')
}

await main()
