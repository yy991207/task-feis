import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function testTaskKeepsParticipantIds() {
  const taskTypeSource = await readSource('../src/types/task.ts')
  const taskServiceSource = await readSource('../src/services/taskService.ts')

  assert.match(
    taskTypeSource,
    /participant_ids\?: string\[\]/,
    'Task 类型里应该保留 participant_ids，避免详情页关注人只能靠 members 猜',
  )
  assert.match(
    taskServiceSource,
    /participant_ids: \[\.\.\.api\.participant_ids\]/,
    '接口转前端 Task 时应该把 participant_ids 原样带下来，给关注人展示和增删回写复用',
  )
}

async function testDetailFollowersSupportAddAndRemove() {
  const detailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    detailSource,
    /const followedUserIds = Array\.from\(new Set\(\[/,
    '详情页应该统一从任务数据里整理关注人列表，避免只看旧的 follower members',
  )
  assert.match(
    detailSource,
    /const handleAddFollowers = async \(\) => \{/,
    '详情页应该有单独的添加关注人处理函数',
  )
  assert.match(
    detailSource,
    /await addParticipants\(task\.guid, toAdd\)/,
    '添加关注人时应该走 participants 接口',
  )
  assert.match(
    detailSource,
    /const handleRemoveFollower = async \(targetUserId: string\) => \{/,
    '详情页应该支持删除单个关注人',
  )
  assert.match(
    detailSource,
    /await removeParticipant\(task\.guid, targetUserId\)/,
    '删除关注人时应该走 remove participant 接口',
  )
  assert.match(
    detailSource,
    /<Drawer/,
    '详情页关注人列表应该改成 antd Drawer 上拉层，方便查看全部关注人',
  )
  assert.match(
    detailSource,
    /placement="bottom"/,
    '关注人列表 Drawer 应该从底部拉起，贴近参考图交互',
  )
  assert.match(
    detailSource,
    /const visibleFollowedUsers = followedUsers\.slice\(0, 3\)/,
    '底部摘要区应该只展示少量关注人头像，完整列表放到上拉层里看',
  )
  assert.match(
    detailSource,
    /<List/,
    '上拉层里应该用 antd List 展示全部关注人',
  )
  assert.match(
    detailSource,
    /className="followers-summary"/,
    '详情页底部应该有独立的关注人摘要条，样式上对齐参考图',
  )
}

async function testTaskTableFollowerCountUsesParticipantIds() {
  const taskTableSource = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    taskTableSource,
    /const followerCount = new Set\(\[/,
    '任务表格里应该先整理真实关注人集合，再展示关注人数',
  )
  assert.match(
    taskTableSource,
    /record\.participant_ids \?\? \[\]/,
    '任务表格的关注人数应该优先读 participant_ids，避免详情页改完主表还是旧值',
  )
}

async function main() {
  await testTaskKeepsParticipantIds()
  await testDetailFollowersSupportAddAndRemove()
  await testTaskTableFollowerCountUsesParticipantIds()
  console.log('task detail followers regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
