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

async function main() {
  await testTaskServiceListsTaskActivities()
  await testTaskDetailMenuOpensHistoryMode()
  await testTaskHistoryViewMatchesRightPanelBehavior()
  console.log('task detail history regressions ok')
}

await main()
