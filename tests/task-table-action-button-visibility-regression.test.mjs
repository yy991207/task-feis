import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableStyleSource() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testSectionActionButtonsAreProminent() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.section-action-btn \{[\s\S]*width: 28px !important;[\s\S]*height: 28px !important;[\s\S]*min-width: 28px;/,
    '任务分组行右侧加号和三点按钮尺寸需要变大',
  )
  assert.match(
    source,
    /\.section-action-btn \{[\s\S]*font-size: 16px !important;[\s\S]*color: #1f2329 !important;/,
    '任务分组行右侧加号和三点按钮需要深黑并放大，但不需要加粗',
  )
  assert.doesNotMatch(
    source,
    /\.section-action-btn \{[\s\S]*font-weight: 700;/,
    '任务分组行右侧加号和三点按钮不需要加粗显示',
  )
  assert.match(
    source,
    /\.section-action-btn \{[\s\S]*\.anticon svg \{[\s\S]*stroke: currentColor;[\s\S]*stroke-width: 14;/,
    '任务分组行右侧图标需要给 SVG 加描边，保证真的变粗',
  )
}

async function testTaskRowActionButtonsAreProminent() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.task-detail-hotspot \{[\s\S]*min-width: 160px;[\s\S]*width: clamp\(160px, 28%, 280px\);[\s\S]*min-height: 28px;/,
    '任务标题后的空白详情热区需要有稳定的可点击宽度，方便点空白处打开详情',
  )
  assert.match(
    source,
    /\.task-detail-hotspot \{[\s\S]*cursor: pointer;[\s\S]*border-radius: 6px;[\s\S]*background: transparent;[\s\S]*border: 1px solid transparent;/,
    '任务标题后的空白详情热区默认应该隐藏自身样式，避免直接显示蓝色方条',
  )
  assert.match(
    source,
    /\.task-detail-hotspot \{[\s\S]*transition: background 0\.15s ease, border-color 0\.15s ease;/,
    '任务标题后的空白详情热区应该明确表现为可点击区域',
  )
  assert.match(
    source,
    /\.task-title-cell \{[\s\S]*&:hover \{[\s\S]*\.task-detail-hotspot \{[\s\S]*background: #edf3ff;[\s\S]*border-color: #d7e6ff;/,
    '任务行悬停时空白详情热区才应该出现轻量蓝色反馈，避免平时显示成蓝色方条',
  )
}

async function testCustomFieldPlaceholderIsProminent() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.custom-field-placeholder \{[\s\S]*color: #1f2329;[\s\S]*font-size: 13px;/,
    '自定义字段里的“点击填写”入口需要改成深黑并放大，但不需要加粗',
  )
  assert.doesNotMatch(
    source,
    /\.custom-field-placeholder \{[\s\S]*font-weight: 600;/,
    '自定义字段里的“点击填写”入口不需要加粗显示',
  )
  assert.match(
    source,
    /\.custom-field-trigger \{[\s\S]*min-height: 30px;[\s\S]*padding: 3px 8px;/,
    '自定义字段可点击区域需要稍微加大，避免入口不明显',
  )
}

async function main() {
  await testSectionActionButtonsAreProminent()
  await testTaskRowActionButtonsAreProminent()
  await testCustomFieldPlaceholderIsProminent()
  console.log('task table action button visibility regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
