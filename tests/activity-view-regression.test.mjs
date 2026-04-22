import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testActivityServiceUsesMeEndpoint() {
  const source = await readSource('../src/services/taskService.ts')

  assert.match(
    source,
    /export interface ApiTaskActivity/,
    '任务服务层应该保留动态记录类型',
  )
  assert.match(
    source,
    /api\/v1\/task-center\/activities\/me\?\$\{qs\}/,
    '动态列表应该调用 /activities/me 接口',
  )
  assert.match(
    source,
    /event_types/,
    '动态列表接口应该支持事件类型过滤参数',
  )
}

async function testActivityViewIsRealDataDriven() {
  const source = await readSource('../src/components/ActivityView/index.tsx')

  assert.match(
    source,
    /listMyActivities/,
    '动态页面应该直接拉取“我的动态”接口，而不是继续依赖 mock 数据',
  )
  assert.match(
    source,
    /onTaskOpen/,
    '动态记录点击后应该能把对应 task 交给详情抽屉打开',
  )
  assert.match(
    source,
    /task\.task_id/,
    '动态记录需要带 task_id，方便点击后定位到具体任务',
  )
  assert.doesNotMatch(
    source,
    /mock\/api/,
    '动态页面不应该再依赖 mock 数据源',
  )
}

async function testTaskListWiresActivityNavAndDrawer() {
  const source = await readSource('../src/pages/TaskList.tsx')

  assert.match(
    source,
    /activeNav === 'activity'/,
    'TaskList 页面应该保留动态视图切换',
  )
  assert.match(
    source,
    /<ActivityView/,
    'TaskList 页面应该继续渲染动态视图',
  )
  assert.match(
    source,
    /onTaskOpen=\{\(task\) => setSelectedTask\(task\)\}/,
    '动态记录点击后应该复用现有任务详情抽屉',
  )
}

async function main() {
  await testActivityServiceUsesMeEndpoint()
  await testActivityViewIsRealDataDriven()
  await testTaskListWiresActivityNavAndDrawer()
  console.log('activity view regressions ok')
}

await main()
