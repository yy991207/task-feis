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
    /export function buildDefaultParticipantIds\(\s*creatorId: string \| undefined,\s*assigneeIds: string\[\],\s*\): string\[\]/,
    '任务服务层应该提供统一的默认关注人整理函数，避免创建和改负责人各写一套',
  )
  assert.match(
    source,
    /\[creatorId, \.\.\.assigneeIds\]\.filter\(\(id\): id is string => Boolean\(id\)\)/,
    '默认关注人整理函数应该同时包含创建人和所有负责人，并过滤空值',
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
  assert.doesNotMatch(
    source,
    /\.filter\(\(id\) => !assigneeIds\.has\(id\)\)/,
    '负责人也必须保留一份 follower member，不能因为已经是负责人就从关注人列表里过滤掉',
  )
}

async function testInlineCreateAddsCreatorAndAssigneeAsParticipants() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /import \{[\s\S]*addParticipants[\s\S]*applyParticipantIdsToTask[\s\S]*buildDefaultParticipantIds[\s\S]*\} from '@\/services\/taskService'/,
    '主表新建任务逻辑应该引入 addParticipants 和本地关注人同步函数',
  )
  assert.match(
    source,
    /const defaultParticipantIds = buildDefaultParticipantIds\(currentUser\.id, assigneeIds\)/,
    '主表新建任务时应该把创建人和负责人整理成默认关注人集合，并用类型谓词过滤空值',
  )
  assert.match(
    source,
    /if \(defaultParticipantIds\.length > 0\) \{[\s\S]*await addParticipants\(apiTask\.task_id, defaultParticipantIds\)/,
    '主表新建任务成功后应该补调 participants 接口，把创建人和负责人同步到关注人',
  )
  assert.match(
    source,
    /createdTask = applyParticipantIdsToTask\(createdTask, \[[\s\S]*\.\.\.\(createdTask\.participant_ids \?\? \[\]\),[\s\S]*\.\.\.defaultParticipantIds,[\s\S]*\]\)/,
    '主表新建任务插入本地状态前应该复用统一同步函数补齐默认关注人',
  )
  assert.match(
    source,
    /const defaultParticipantIds = buildDefaultParticipantIds\(task\.creator\.id, nextAssigneeIds\)/,
    '主表修改负责人时也应该把创建人和新负责人整理成默认关注人集合',
  )
  assert.match(
    source,
    /if \(defaultParticipantIds\.length > 0\) \{[\s\S]*await addParticipants\(task\.guid, defaultParticipantIds\)/,
    '主表修改负责人成功后应该补调 participants 接口，让新负责人默认进入关注人',
  )
}

async function testSubtaskCreateAddsCreatorAndAssigneeAsParticipants() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /import \{[\s\S]*addParticipants[\s\S]*applyParticipantIdsToTask[\s\S]*buildDefaultParticipantIds[\s\S]*\} from '@\/services\/taskService'/,
    '详情页子任务新建逻辑应该引入 addParticipants 和本地关注人同步函数',
  )
  assert.match(
    source,
    /const defaultParticipantIds = buildDefaultParticipantIds\(appConfig\.user_id, subtaskAssigneeIds\)/,
    '详情页新建子任务时应该把当前创建人和子任务负责人整理成默认关注人集合，并用类型谓词过滤空值',
  )
  assert.match(
    source,
    /if \(defaultParticipantIds\.length > 0\) \{[\s\S]*await addParticipants\(apiTask\.task_id, defaultParticipantIds\)/,
    '详情页新建子任务成功后应该同步调用 participants 接口，补齐默认关注人',
  )
  assert.match(
    source,
    /createdTask = applyParticipantIdsToTask\(createdTask, \[[\s\S]*\.\.\.\(createdTask\.participant_ids \?\? \[\]\),[\s\S]*\.\.\.defaultParticipantIds,[\s\S]*\]\)/,
    '详情页新建子任务插入本地状态前应该复用统一同步函数补齐默认关注人',
  )
  assert.match(
    source,
    /const defaultParticipantIds = buildDefaultParticipantIds\(task\.creator\.id, nextAssigneeIds\)/,
    '详情页修改当前任务负责人时也应该把创建人和新负责人整理成默认关注人集合',
  )
  assert.match(
    source,
    /await addParticipants\(task\.guid, defaultParticipantIds\)/,
    '详情页修改当前任务负责人成功后应该补调 participants 接口，让新负责人默认进入关注人',
  )
  assert.match(
    source,
    /const defaultParticipantIds = buildDefaultParticipantIds\(subtask\.creator\.id, nextAssigneeIds\)/,
    '详情页修改子任务负责人时也应该把子任务创建人和新负责人整理成默认关注人集合',
  )
  assert.match(
    source,
    /await addParticipants\(subtask\.guid, defaultParticipantIds\)/,
    '详情页修改子任务负责人成功后应该补调 participants 接口，让新负责人默认进入关注人',
  )
  assert.match(
    source,
    /const defaultFollowerIds = buildDefaultParticipantIds\(\s*task\.creator\.id,\s*assignees\.map\(\(member\) => member\.id\),\s*\)/,
    '详情页关注人列表应该默认合并当前任务创建人和负责人，避免旧任务没有 participant 回写时漏人',
  )
  assert.match(
    source,
    /const followedUserIds = Array\.from\(new Set\(\[[\s\S]*\.\.\.defaultFollowerIds,[\s\S]*\.\.\.\(task\.participant_ids \?\? \[\]\),/,
    '详情页整理关注人列表时应该优先把默认关注人放进集合',
  )
}

async function testTaskTableFollowerCountIncludesDefaultParticipants() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /const defaultFollowerIds = buildDefaultParticipantIds\(\s*record\.creator\.id,\s*record\.members[\s\S]*\.filter\(\(member\) => member\.role === 'assignee'\)[\s\S]*\.map\(\(member\) => member\.id\),\s*\)/,
    '主表关注人数应该默认合并创建人和负责人，避免列表列数和详情页不一致',
  )
  assert.match(
    source,
    /const followerCount = new Set\(\[[\s\S]*\.\.\.defaultFollowerIds,[\s\S]*\.\.\.\(record\.participant_ids \?\? \[\]\),/,
    '主表关注人数统计时应该把默认关注人放进关注人集合',
  )
}

async function main() {
  await testTaskServiceExposesAddParticipants()
  await testInlineCreateAddsCreatorAndAssigneeAsParticipants()
  await testSubtaskCreateAddsCreatorAndAssigneeAsParticipants()
  await testTaskTableFollowerCountIncludesDefaultParticipants()
  console.log('task create default followers regressions ok')
}

await main()
