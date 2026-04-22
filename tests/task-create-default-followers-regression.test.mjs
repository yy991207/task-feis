import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskServiceExposesAddParticipants() {
  const source = await readSource('../src/services/taskService.ts')

  assert.match(
    source,
    /export function addParticipants\(\s*taskId: string,\s*userIds: string\[\],\s*\): Promise<void>/,
    '任务服务层应该继续提供 participants 接口，给任务创建后的默认关注人同步复用',
  )
  assert.match(
    source,
    /export function applyParticipantIdsToTask\(task: Task, participantIds: string\[\]\): Task \{/,
    '任务服务层应该提供统一的本地任务关注人同步函数，避免主表和详情页各写一套',
  )
  assert.match(
    source,
    /participant_ids: nextParticipantIds,/,
    '本地任务关注人同步函数应该把 participant_ids 一起更新，保证关注人数马上可见',
  )
  assert.match(
    source,
    /role: 'follower'/,
    '本地任务关注人同步函数应该补齐 follower members，保证详情页头像和关注人列表马上可见',
  )
}

async function testInlineCreateAddsCreatorAndAssigneeAsParticipants() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /import \{[\s\S]*addParticipants[\s\S]*applyParticipantIdsToTask[\s\S]*\} from '@\/services\/taskService'/,
    '主表新建任务逻辑应该引入 addParticipants 和本地关注人同步函数',
  )
  assert.match(
    source,
    /const defaultParticipantIds = Array\.from\(new Set\(\[currentUser\.id, assigneeId\]\.filter\(Boolean\)\)\)/,
    '主表新建任务时应该把创建人和负责人整理成默认关注人集合，并自动去重',
  )
  assert.match(
    source,
    /if \(defaultParticipantIds\.length > 0\) \{[\s\S]*await addParticipants\(apiTask\.task_id, defaultParticipantIds\)/,
    '主表新建任务成功后应该补调 participants 接口，把创建人和负责人同步到关注人',
  )
  assert.match(
    source,
    /createdTask = applyParticipantIdsToTask\(createdTask, defaultParticipantIds\)/,
    '主表新建任务插入本地状态前应该复用统一同步函数补齐默认关注人',
  )
}

async function testSubtaskCreateAddsCreatorAndAssigneeAsParticipants() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /import \{[\s\S]*addParticipants[\s\S]*applyParticipantIdsToTask[\s\S]*\} from '@\/services\/taskService'/,
    '详情页子任务新建逻辑应该引入 addParticipants 和本地关注人同步函数',
  )
  assert.match(
    source,
    /const defaultParticipantIds = Array\.from\(new Set\(\[appConfig\.user_id, subtaskAssigneeId\]\.filter\(Boolean\)\)\)/,
    '详情页新建子任务时应该把当前创建人和子任务负责人整理成默认关注人集合',
  )
  assert.match(
    source,
    /if \(defaultParticipantIds\.length > 0\) \{[\s\S]*await addParticipants\(apiTask\.task_id, defaultParticipantIds\)/,
    '详情页新建子任务成功后应该同步调用 participants 接口，补齐默认关注人',
  )
  assert.match(
    source,
    /createdTask = applyParticipantIdsToTask\(createdTask, defaultParticipantIds\)/,
    '详情页新建子任务插入本地状态前应该复用统一同步函数补齐默认关注人',
  )
}

async function main() {
  await testTaskServiceExposesAddParticipants()
  await testInlineCreateAddsCreatorAndAssigneeAsParticipants()
  await testSubtaskCreateAddsCreatorAndAssigneeAsParticipants()
  console.log('task create default followers regressions ok')
}

await main()
