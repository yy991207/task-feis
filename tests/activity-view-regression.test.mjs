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
    /activity\.task_id/,
    '动态记录需要带 task_id，方便点击后定位到具体任务',
  )
  assert.match(
    source,
    /normalizeRichContent/,
    '动态正文展示前应该先清洗 HTML 标签，避免把 <div>、<br /> 直接渲染出来',
  )
  assert.match(
    source,
    /className="activity-message"/,
    '动态列表应该改成单行消息布局，而不是继续用双行摘要布局',
  )
  assert.match(
    source,
    /<Avatar\s+size=\{24\}[\s\S]*className="activity-avatar"/,
    '动态列表里的头像尺寸应该放大，贴近参考布局',
  )
  assert.doesNotMatch(
    source,
    /FilterOutlined/,
    '动态页顶部不应该再显示筛选按钮',
  )
  assert.doesNotMatch(
    source,
    /mock\/api/,
    '动态页面不应该再依赖 mock 数据源',
  )
}

async function testActivityViewMatchesReferenceDensity() {
  const styleSource = await readSource('../src/components/ActivityView/index.less')

  assert.match(
    styleSource,
    /\.activity-group \{[\s\S]*grid-template-columns: 64px minmax\(0, 1fr\)/,
    '日期左栏宽度应该贴近参考布局',
  )
  assert.match(
    styleSource,
    /\.activity-item \{[\s\S]*grid-template-columns: 52px 24px minmax\(0, 1fr\)/,
    '每条动态应该保留时间列、头像列和正文列三栏布局',
  )
  assert.match(
    styleSource,
    /\.activity-time \{[\s\S]*font-size: 14px;[\s\S]*line-height: 22px;/,
    '时间列字体应该比当前更大一点，和参考图的视觉密度一致',
  )
  assert.match(
    styleSource,
    /\.activity-avatar \{[\s\S]*font-size: 12px !important;/,
    '头像字号应该随头像尺寸一起放大',
  )
  assert.match(
    styleSource,
    /\.activity-message \{[\s\S]*font-size: 15px;[\s\S]*line-height: 24px;[\s\S]*word-break: break-word;/,
    '正文行距和字号应该明显放大，并允许换行后保持自然间距',
  )
  assert.match(
    styleSource,
    /\.activity-person,[\s\S]*\.activity-task-title[\s\S]*color: #3370ff;/,
    '人物信息和任务名应该保持高亮色，方便扫读',
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
  await testActivityViewMatchesReferenceDensity()
  await testTaskListWiresActivityNavAndDrawer()
  console.log('activity view regressions ok')
}

await main()
