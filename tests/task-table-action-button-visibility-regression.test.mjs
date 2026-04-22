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
    /\.section-action-btn \{[\s\S]*font-size: 16px !important;[\s\S]*font-weight: 700;[\s\S]*color: #1f2329 !important;/,
    '任务分组行右侧加号和三点按钮需要深黑加粗',
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
    /\.task-detail-btn\.ant-btn \{[\s\S]*height: 28px;[\s\S]*font-size: 14px !important;[\s\S]*font-weight: 700;[\s\S]*color: #1f2329 !important;/,
    '任务行里的“详情”按钮需要变大、深黑、加粗',
  )
  assert.match(
    source,
    /\.task-row-more-btn\.ant-btn \{[\s\S]*min-width: 28px;[\s\S]*height: 28px;[\s\S]*font-size: 16px !important;[\s\S]*font-weight: 700;[\s\S]*color: #1f2329 !important;/,
    '任务行里的三点按钮需要变大、深黑、加粗',
  )
  assert.match(
    source,
    /\.task-row-more-btn\.ant-btn \{[\s\S]*\.anticon svg \{[\s\S]*stroke: currentColor;[\s\S]*stroke-width: 14;/,
    '任务行三点图标需要给 SVG 加描边，保证真的变粗',
  )
}

async function testCustomFieldPlaceholderIsProminent() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.custom-field-placeholder \{[\s\S]*color: #1f2329;[\s\S]*font-size: 13px;[\s\S]*font-weight: 600;/,
    '自定义字段里的“点击填写”入口需要改成深黑并放大加粗',
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
