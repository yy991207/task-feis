import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskServiceListsTaskActivities() {
  const source = await readSource('../src/services/taskService.ts')

  assert.match(
    source,
    /export interface ApiTaskActivity/,
    '任务服务层应该定义任务历史记录接口类型，避免详情页直接用 any 猜字段',
  )
  assert.match(
    source,
    /export async function listTaskActivities\(/,
    '任务服务层应该提供 listTaskActivities 方法',
  )
  assert.match(
    source,
    /api\/v1\/task-center\/tasks\/\$\{taskId\}\/activities\?\$\{qs\}/,
    '历史记录接口应该调用任务动态接口路径',
  )
  assert.match(
    source,
    /qs\.set\('user_id', appConfig\.user_id\)/,
    '历史记录接口必须带当前 user_id',
  )
}

async function testTaskDetailMenuOpensHistoryMode() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const menuStart = source.indexOf('const moreMenu = {')
  const menuEnd = source.indexOf('const handleResizeStart', menuStart)
  const menuSource = source.slice(menuStart, menuEnd)

  assert.match(
    source,
    /listTaskActivities/,
    '任务详情页应该调用 listTaskActivities 加载历史记录',
  )
  assert.match(
    menuSource,
    /key: 'history'[\s\S]*label: '查看历史记录'/,
    '任务详情页三点菜单应该提供“查看历史记录”入口',
  )
  assert.match(
    menuSource,
    /setHistoryOpen\(true\)/,
    '点击查看历史记录后应该进入历史记录模式',
  )
}

async function testTaskHistoryViewMatchesRightPanelBehavior() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const \[historyOpen, setHistoryOpen\] = useState\(false\)/,
    '任务详情页应该维护历史记录打开状态',
  )
  assert.match(
    source,
    /historyOpen[\s\S]*listTaskActivities\(task\.guid, 1, 100\)/,
    '历史记录打开后应该按当前 task.guid 拉取接口数据',
  )
  assert.match(
    source,
    /className="detail-history-panel"/,
    '历史记录应该渲染成右侧独立面板样式',
  )
  assert.match(
    source,
    /历史记录/,
    '历史记录面板标题应该显示“历史记录”',
  )
  assert.match(
    source,
    /groupTaskActivitiesByDate/,
    '历史记录列表应该按日期分组，贴近飞书历史记录样式',
  )
  assert.match(
    source,
    /formatTaskActivityText/,
    '历史记录每条记录应该统一格式化成可读文案',
  )
}

async function testTaskHistoryUsesFeishuLikeStructuredTimeline() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const styleSource = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /renderTaskActivityMessage/,
    '历史记录文案应该结构化渲染，不能只输出整句纯文本',
  )
  assert.match(
    source,
    /className="detail-history-person-highlight"/,
    '历史记录里的操作人和涉及人员应该使用高亮样式',
  )
  assert.match(
    source,
    /className="detail-history-task-link"/,
    '历史记录里的任务名应该按飞书样式做蓝色链接视觉',
  )
  assert.match(
    source,
    /className="detail-history-attachment-card"/,
    '附件类历史记录应该渲染成独立附件卡片，而不是只拼文件名文本',
  )
  assert.match(
    styleSource,
    /\.detail-history-item\s*\{[\s\S]*grid-template-columns: 46px 18px minmax\(0, 1fr\)/,
    '历史记录每行应该固定时间列、头像列和内容列，贴近飞书时间线布局',
  )
  assert.match(
    styleSource,
    /\.detail-history-person-highlight\s*\{[\s\S]*color: #3370ff/,
    '历史记录人物高亮应该使用项目蓝色，避免默认黑字看不出重点',
  )
  assert.match(
    styleSource,
    /\.detail-history-message\s*\{[\s\S]*line-height: 18px/,
    '历史记录文案行高应该更贴近飞书紧凑列表',
  )
}

async function main() {
  await testTaskServiceListsTaskActivities()
  await testTaskDetailMenuOpensHistoryMode()
  await testTaskHistoryViewMatchesRightPanelBehavior()
  await testTaskHistoryUsesFeishuLikeStructuredTimeline()
  console.log('task detail history regressions ok')
}

await main()
