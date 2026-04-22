import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarStyleSource() {
  return readFile(new URL('../src/components/Sidebar/index.less', import.meta.url), 'utf8')
}

async function testSidebarTextUsesDeepBlack() {
  const source = await readSidebarStyleSource()

  assert.match(
    source,
    /\.sidebar-menu \{[\s\S]*\.ant-menu-item-group-title \{[\s\S]*color: #1f2329;/,
    '左侧边栏菜单分组标题应该改成深黑色字体，不要继续用浅灰色',
  )
  assert.match(
    source,
    /\.ant-tree \.tree-section \{[\s\S]*> \.ant-tree-node-content-wrapper \{[\s\S]*color: #1f2329;/,
    '左侧边栏树里的分组标题应该改成深黑色字体',
  )
  assert.match(
    source,
    /\.create-group-wrap \{[\s\S]*\.create-group-btn \{[\s\S]*color: #1f2329 !important;/,
    '左侧边栏底部“新建清单分组”按钮文案应该改成深黑色字体',
  )
}

async function main() {
  await testSidebarTextUsesDeepBlack()
  console.log('sidebar dark font regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
