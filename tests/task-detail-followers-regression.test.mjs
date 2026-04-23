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
  const followersPopoverStart = detailSource.indexOf('const followerPopoverContent = (')
  const followersPopoverEnd = detailSource.indexOf('const followersEntry = (', followersPopoverStart)
  const followersPopoverSource = detailSource.slice(followersPopoverStart, followersPopoverEnd)

  assert.match(
    detailSource,
    /const followedUserIds = Array\.from\(new Set\(\[/,
    '详情页应该统一从任务数据里整理关注人列表，避免只看旧的 follower members',
  )
  assert.doesNotMatch(
    detailSource,
    /const defaultFollowerIds = buildDefaultParticipantIds\(/,
    '详情页关注人列表不应该再把创建者和负责人强制并入默认关注人，否则删除后会被前端补回',
  )
  assert.match(
    detailSource,
    /const handleFollowersChange = async \(nextFollowerIds: string\[\]\) => \{/,
    '详情页关注人应该和负责人一样通过共享选人组件直接增删',
  )
  assert.match(
    detailSource,
    /const toAdd = nextUniqueFollowerIds\.filter\(\(id\) => !currentFollowerIds\.includes\(id\)\)/,
    '关注人变更时应该对比新旧数组，找出需要新增的人',
  )
  assert.match(
    detailSource,
    /await Promise\.all\(\[[\s\S]*toAdd\.map\(\(id\) => addParticipants\(task\.guid, \[id\]\)\)[\s\S]*toRemove\.map\(\(id\) => removeParticipant\(task\.guid, id\)\)/,
    '关注人增删应该在同一个变更函数里分别调用新增和删除接口',
  )
  assert.match(
    detailSource,
    /message\.error\(getActionErrorMessage\(err, '更新关注人失败'\)\)/,
    '关注人统一增删失败时应该给出标准错误提示',
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
    /<UserSearchSelect[\s\S]*className="followers-search"[\s\S]*mode="multiple"[\s\S]*value=\{followedUserIds\}[\s\S]*onChange=\{\(value\) => void handleFollowersChange\(Array\.isArray\(value\) \? value : \[\]\)\}/,
    '关注人弹层应该复用多人选人组件，点击列表人员完成增删',
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
  assert.doesNotMatch(
    detailSource,
    /className="followers-picker-inline"/,
    '关注人弹层不应该再保留单独添加按钮行，避免和负责人选人逻辑不一致',
  )
  assert.doesNotMatch(
    followersPopoverSource,
    /followers-count/,
    '关注人弹层工具栏不应该再显示人数，避免右侧多余信息占位',
  )
  assert.doesNotMatch(
    followersPopoverSource,
    /followers-picker-actions|followers-picker-row|followers-list-title|followers-section-label|<List|DeleteOutlined|handleAddFollowers|handleRemoveFollower/,
    '关注人弹层不应该再保留独立添加按钮、删除列表或旧分块标题',
  )
  assert.doesNotMatch(
    detailSource,
    /isDefaultFollower/,
    '详情页关注人列表不应该再区分默认关注人和普通关注人，所有关注人都应该允许删除',
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
  const richInputSource = await readSource('../src/components/TaskRichInput/index.tsx')
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
  assert.doesNotMatch(
    detailSource,
    /<Tooltip title="关闭详情"/,
    '关闭详情入口不应该再显示“关闭详情”浮窗，避免鼠标移上去出现多余提示',
  )
  assert.match(
    detailSource,
    /className="detail-history-close"[\s\S]*aria-label="关闭详情"/,
    '历史记录页右上角关闭按钮应该保留 aria-label，避免去掉浮窗后按钮语义丢失',
  )
  assert.match(
    detailSource,
    /className="detail-action-icon[^"]*"[\s\S]*aria-label="关闭详情"/,
    '详情页右上角关闭按钮应该保留 aria-label，避免去掉浮窗后按钮语义丢失',
  )
  ;[
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
  ].forEach((title) => {
    assert.match(
      detailSource,
      new RegExp(`<Tooltip title="${title}"`),
      `详情页图标应该有“${title}”浮窗提示`,
    )
  })
  ;[
    '移除评论图片',
    '正文样式：加粗',
    '表情：插入表情符号',
    '@ 提及：选择任务成员',
    '添加图片：上传或粘贴图片',
    '添加评论附件：上传文件',
    '发送评论：提交当前内容',
  ].forEach((title) => {
    assert.match(
      richInputSource,
      new RegExp(title),
      `统一输入框工具组件应该有“${title}”浮窗提示`,
    )
  })
}

async function testTaskTableFollowerCountUsesParticipantIds() {
  const taskTableSource = await readSource('../src/components/TaskTable/index.tsx')

  assert.doesNotMatch(
    taskTableSource,
    /const defaultFollowerIds = buildDefaultParticipantIds\(/,
    '任务表格关注人数不应该再把创建者和负责人强制算作默认关注人，否则和可删除行为冲突',
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
