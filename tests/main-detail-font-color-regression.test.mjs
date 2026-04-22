import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testMainPageTextUsesDeepBlackAndDetailButtonBlue() {
  const styleSource = await readSource('../src/components/TaskTable/index.less')

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
    /\.task-detail-btn\.ant-btn \{[\s\S]*color: #3370ff !important;/,
    '主页面任务行里的“详情”按钮应该改成蓝色',
  )
  assert.match(
    styleSource,
    /\.task-detail-btn\.ant-btn \{[\s\S]*&:hover \{[\s\S]*color: #1456d9 !important;/,
    '主页面任务行里的“详情”按钮 hover 时也应该保持蓝色强调',
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
    /\.subtask-detail-btn \{[\s\S]*color: #3370ff;/,
    '任务详情页子任务的“详情”按钮应该保持蓝色',
  )
  assert.doesNotMatch(
    detailSource,
    /子任务详情/,
    '任务详情页子任务入口文案不能再显示“子任务详情”',
  )
  assert.match(
    detailSource,
    /className="subtask-detail-btn"[\s\S]*>\s*详情\s*<\/Button>/,
    '任务详情页子任务入口文案应该统一显示为“详情”',
  )
}

async function main() {
  await testMainPageTextUsesDeepBlackAndDetailButtonBlue()
  await testDetailPageTextUsesDeepBlackAndSubtaskDetailCopy()
  console.log('main detail font color regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
