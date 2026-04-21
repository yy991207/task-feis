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
  const taskTableSource = await readSource('../src/components/TaskTable/index.tsx')

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
  assert.doesNotMatch(
    detailSource,
    /setSelectedFollowerId\(undefined\)\s*setFollowersPopoverOpen\(false\)/,
    '添加关注人成功后不应该关闭关注人弹层，应该和删除关注人一样保持打开方便继续操作',
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
    /<Popover/,
    '详情页关注人列表应该改成锚点式 antd Popover，避免全宽底部抽屉把版面撑坏',
  )
  assert.match(
    detailSource,
    /className="[^"]*detail-followers-row[^"]*"[\s\S]*<Popover[\s\S]*placement="bottomLeft"/,
    '关注人入口移到负责人下面后，弹层应该从该行下方展开',
  )
  assert.match(
    detailSource,
    /const visibleFollowedUsers = followedUsers\.slice\(0, 3\)/,
    '关注人入口应该只展示少量关注人头像，完整列表放到弹层里看',
  )
  assert.match(
    detailSource,
    /<List/,
    '上拉层里应该用 antd List 展示全部关注人',
  )
  assert.match(
    detailSource,
    /<Card[\s\S]*className="followers-popover-card"/,
    '关注人管理弹层应该用 antd Card 重新组织标题、选择区和列表，避免裸 div 拼出来显得粗糙',
  )
  assert.doesNotMatch(
    detailSource,
    /followers-popover-title|followers-popover-subtitle/,
    '关注人弹层顶部的头像和人数标题块应该删除，避免重复占空间',
  )
  assert.match(
    detailSource,
    /<UserSearchSelect[\s\S]*className="followers-search"/,
    '添加关注人应该复用主页面负责人选择的 UserSearchSelect 搜索控件',
  )
  assert.match(
    taskTableSource,
    /<UserSearchSelect[\s\S]*label="添加负责人"/,
    '主页面负责人选择应该使用共享的 UserSearchSelect，确保关注人和负责人选人控件一致',
  )
  assert.doesNotMatch(
    detailSource,
    /AutoComplete/,
    '关注人的选人组件不应该再用单独的 AutoComplete，避免和主页面负责人选择控件不一致',
  )
  assert.match(
    detailSource,
    /className="followers-picker-inline"/,
    '添加关注人的搜索框和添加按钮应该在同一行显示',
  )
  assert.doesNotMatch(
    detailSource,
    /followers-count/,
    '关注人弹层工具栏不应该再显示人数，避免右侧多余信息占位',
  )
  assert.doesNotMatch(
    detailSource,
    /mode="multiple"|followers-picker-actions|followers-picker-row|followers-list-title|followers-section-label/,
    '添加关注人不应该再用多选 Select、独立按钮行或上下分块标题，避免布局上下堆叠',
  )
  assert.match(
    detailSource,
    /actions=\{\[\s*<Button[\s\S]*DeleteOutlined/,
    '关注人列表删除操作应该继续保留，并使用 antd List 的 actions 区域承载',
  )
  assert.doesNotMatch(
    detailSource,
    /description=\{user\.id\}/,
    '关注人列表只应该显示一行名称，不要再把同一个用户 id 放到第二行重复显示',
  )
  assert.match(
    detailSource,
    /className="followers-summary"/,
    '详情页应该有独立的关注人摘要条，样式上对齐参考图',
  )
  assert.match(
    detailSource,
    /className="followers-popover"/,
    '关注人弹层应该有独立的卡片容器，方便控制无边框摘要和弹层滚动布局',
  )
  assert.match(
    detailSource,
    /backgroundColor: '#7b67ee'/,
    '关注人头像颜色应该和主页面当前紫色头像保持一致',
  )
}

async function testDetailFollowersAreBelowAssigneeAndIconsHaveTooltips() {
  const detailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const assigneeIndex = detailSource.indexOf('{/* Assignee row */}')
  const followersIndex = detailSource.indexOf('detail-followers-row')
  const dateIndex = detailSource.indexOf('{/* Date row */}')
  const footerIndex = detailSource.indexOf('{/* Footer */}')

  assert.ok(
    assigneeIndex !== -1 && followersIndex !== -1 && dateIndex !== -1,
    '详情页应该保留负责人、关注人和日期区域的清晰结构标记',
  )
  assert.ok(
    assigneeIndex < followersIndex && followersIndex < dateIndex,
    '关注人入口应该放在负责人 UI 下面，并且在日期 UI 上面',
  )
  assert.ok(
    followersIndex < footerIndex,
    '关注人入口不应该继续放在详情页底部评论区下面',
  )
  assert.match(
    detailSource,
    /import Tooltip from 'antd\/es\/tooltip'/,
    '详情页图标浮窗应该统一使用 antd Tooltip',
  )
  ;[
    '更多操作',
    '关闭详情',
    '负责人',
    '关注人',
    '开始和截止时间',
    '任务清单和分组',
    '任务描述',
    '子任务',
    '附件',
    '预览附件',
    '下载附件',
    '删除附件',
    '更多评论操作',
    '移除评论图片',
    '正文样式',
    '表情',
    '@ 提及',
    '添加图片',
    '添加评论附件',
    '发送评论',
  ].forEach((title) => {
    assert.match(
      detailSource,
      new RegExp(`<Tooltip title="${title}"`),
      `详情页图标应该有“${title}”浮窗提示`,
    )
  })
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
  await testDetailFollowersAreBelowAssigneeAndIconsHaveTooltips()
  await testTaskTableFollowerCountUsesParticipantIds()
  console.log('task detail followers regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
