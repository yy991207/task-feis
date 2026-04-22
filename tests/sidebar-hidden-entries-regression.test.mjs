import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarSource() {
  return readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8')
}

async function testSidebarTopMenuHidesSpecifiedEntries() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /const topMenuItems: MenuProps\['items'\] = \[[\s\S]*key: 'my-assigned'[\s\S]*key: 'my-followed'[\s\S]*key: 'activity'[\s\S]*label: '动态'[\s\S]*\]/,
    'Sidebar 顶部主菜单应该新增动态入口，并保留我负责的和我关注的入口',
  )
  assert.match(
    source,
    /HistoryOutlined/,
    '动态入口应该使用历史记录风格图标，和右侧动态页面保持一致',
  )
  assert.doesNotMatch(
    source,
    /const topMenuItems: MenuProps\['items'\] = \[[\s\S]*key: 'from-project'/,
    'Sidebar 顶部主菜单不应该再显示来自飞书项目入口',
  )
  assert.doesNotMatch(
    source,
    /const topMenuItems: MenuProps\['items'\] = \[[\s\S]*key: 'settings'/,
    'Sidebar 顶部主菜单不应该再显示团队管理入口',
  )
}

async function main() {
  await testSidebarTopMenuHidesSpecifiedEntries()
  console.log('sidebar hidden entries regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
