import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarStyleSource() {
  return readFile(new URL('../src/components/Sidebar/index.less', import.meta.url), 'utf8')
}

async function testGroupActionButtonsAreProminent() {
  const source = await readSidebarStyleSource()

  assert.match(
    source,
    /\.group-action-btn \{[\s\S]*width: 26px !important;[\s\S]*height: 26px !important;[\s\S]*min-width: 26px;/,
    '清单分组右侧的三点和加号按钮尺寸需要放大，避免在侧边栏里不明显',
  )
  assert.match(
    source,
    /\.group-action-btn \{[\s\S]*font-size: 15px !important;[\s\S]*font-weight: 700;/,
    '清单分组右侧的三点和加号按钮需要加粗显示',
  )
  assert.match(
    source,
    /\.group-action-btn \{[\s\S]*color: #1f2329 !important;/,
    '清单分组右侧的三点和加号按钮需要使用更深颜色，提高可见性',
  )
  assert.match(
    source,
    /\.group-action-btn \{[\s\S]*\.anticon svg \{[\s\S]*stroke: currentColor;[\s\S]*stroke-width: 14;/,
    'Ant Design 图标本身需要加描边，否则只设置 font-weight 不会让 svg 图标真正变粗',
  )
}

async function testTasklistActionButtonsAreProminent() {
  const source = await readSidebarStyleSource()

  assert.match(
    source,
    /\.tasklist-action-btn \{[\s\S]*width: 26px !important;[\s\S]*height: 26px !important;[\s\S]*min-width: 26px;/,
    '清单行右侧的三点按钮尺寸需要和分组操作按钮保持一致',
  )
  assert.match(
    source,
    /\.tasklist-action-btn \{[\s\S]*font-size: 15px !important;[\s\S]*font-weight: 700;/,
    '清单行右侧的三点按钮需要和分组操作按钮一样加粗显示',
  )
  assert.match(
    source,
    /\.tasklist-action-btn \{[\s\S]*color: #1f2329 !important;/,
    '清单行右侧的三点按钮需要使用更深颜色，提高可见性',
  )
  assert.match(
    source,
    /\.tasklist-action-btn \{[\s\S]*\.anticon svg \{[\s\S]*stroke: currentColor;[\s\S]*stroke-width: 14;/,
    '清单行右侧的三点 SVG 图标需要和分组操作按钮一样加描边',
  )
}

async function main() {
  await testGroupActionButtonsAreProminent()
  await testTasklistActionButtonsAreProminent()
  console.log('sidebar group action size regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
