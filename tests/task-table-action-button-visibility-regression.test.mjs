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
  const hotspotStart = source.indexOf('.task-detail-hotspot {')
  const hotspotEnd = source.indexOf('    }', hotspotStart)
  const hotspotSource = source.slice(hotspotStart, hotspotEnd)

  assert.ok(
    hotspotStart !== -1 && hotspotEnd !== -1,
    '任务标题后面应该保留透明详情热区样式块',
  )

  assert.match(
    source,
    /\.task-detail-hotspot \{[\s\S]*flex: 1;[\s\S]*min-width: 0;[\s\S]*min-height: 28px;/,
    '任务标题后的空白详情热区应该填满标题列剩余空间，不能再是固定长度',
  )
  assert.match(
    source,
    /\.task-detail-hotspot \{[\s\S]*cursor: pointer;[\s\S]*border-radius: 6px;[\s\S]*background: transparent;[\s\S]*border: 1px solid transparent;/,
    '任务标题后的空白详情热区默认应该隐藏自身样式，避免直接显示蓝色方条',
  )
  assert.match(
    source,
    /\.task-detail-hotspot \{[\s\S]*cursor: pointer;[\s\S]*background: transparent;[\s\S]*border: 1px solid transparent;/,
    '任务标题后的空白详情热区应该只保留透明点击层，不显示任何按钮样式',
  )
  assert.doesNotMatch(
    hotspotSource,
    /&:hover[\s\S]*(background|border-color):/,
    '任务标题后的空白详情热区 hover 时也不能显示背景或边框',
  )
  assert.doesNotMatch(
    hotspotSource,
    /background: #(?!transparent)|border-color:/,
    '任务行 hover 时也不能把隐藏热区显示成蓝色方条',
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
