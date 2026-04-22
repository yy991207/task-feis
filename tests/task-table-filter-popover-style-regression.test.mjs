import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableStyleSource() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function main() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.task-filter-popover\s*\{[\s\S]*\.ant-popover-inner\s*\{[\s\S]*background:\s*transparent !important;[\s\S]*box-shadow:\s*none !important;[\s\S]*border-radius:\s*0 !important;/,
    '筛选浮层应该去掉外层默认面板背景、阴影和圆角，只保留内部卡片样式',
  )
  assert.match(
    source,
    /\.task-filter-popover\s*\{[\s\S]*\.ant-popover-arrow\s*\{[\s\S]*display:\s*none !important;/,
    '筛选浮层不应该保留默认箭头，避免出现额外外框视觉',
  )

  console.log('task table filter popover style regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
