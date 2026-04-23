import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testMainPageTextUsesDeepBlackAndDetailHotspotBlue() {
  const styleSource = await readSource('../src/components/TaskTable/index.less')
  const hotspotStart = styleSource.indexOf('.task-detail-hotspot {')
  const hotspotEnd = styleSource.indexOf('    }', hotspotStart)
  const hotspotSource = styleSource.slice(hotspotStart, hotspotEnd)

  assert.match(
    styleSource,
    /\.task-table \{[\s\S]*color: #1f2329;/,
    '主页面任务表格默认文字应该统一用深黑色',
  )
  assert.match(
    styleSource,
    /\.ant-table-thead > tr > th \{[\s\S]*color: #1f2329;/,
    '主页面表头文字应该是深黑色，不要继续用浅灰',
  )
  assert.match(
    styleSource,
    /\.tasklist-head-meta \{[\s\S]*color: #1f2329;/,
    '主页面标题旁边的辅助文字也应该是深黑色',
  )
  assert.match(
    styleSource,
    /\.task-detail-hotspot \{[\s\S]*background: transparent;[\s\S]*border: 1px solid transparent;/,
    '主页面任务行里的详情空白热区默认应该隐藏样式，不要一直显示蓝色方条',
  )
  assert.doesNotMatch(
    hotspotSource,
    /&:hover[\s\S]*(background|border-color):/,
    '主页面任务行 hover 时也不能显示详情空白热区样式',
  )
}

async function testDetailPageTextUsesDeepBlackAndSubtaskDetailCopy() {
  const styleSource = await readSource('../src/components/TaskDetailPanel/index.less')
  const detailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    styleSource,
    /\.detail-panel \{[\s\S]*color: #1f2329;/,
    '任务详情页默认文字应该统一用深黑色',
  )
  assert.match(
    styleSource,
    /\.field-placeholder \{[\s\S]*color: #1f2329;/,
    '任务详情页字段占位文字应该跟随深黑色字体要求',
  )
  assert.match(
    styleSource,
    /\.comment-content \{[\s\S]*color: #1f2329;/,
    '任务详情页评论内容文字应该是深黑色',
  )
  assert.match(
    styleSource,
    /\.subtask-detail-btn \{[\s\S]*color: #8f959e;/,
    '任务详情页子任务的箭头入口应该使用更轻的灰色图标风格',
  )
  assert.doesNotMatch(
    detailSource,
    /子任务详情/,
    '任务详情页子任务入口文案不能再显示“子任务详情”',
  )
  assert.doesNotMatch(
    detailSource,
    /className="subtask-detail-btn"[\s\S]*>\s*详情\s*<\/Button>/,
    '任务详情页子任务入口不应该再显示“详情”文字，应改成箭头按钮',
  )
  assert.match(
    detailSource,
    /className="subtask-detail-btn"[\s\S]*aria-label="查看详情"/,
    '任务详情页子任务入口改成箭头按钮后，仍然应该保留 aria-label',
  )
}

async function main() {
  await testMainPageTextUsesDeepBlackAndDetailHotspotBlue()
  await testDetailPageTextUsesDeepBlackAndSubtaskDetailCopy()
  console.log('main detail font color regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
