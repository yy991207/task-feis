import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarStyleSource() {
  return readFile(new URL('../src/components/Sidebar/index.less', import.meta.url), 'utf8')
}

async function testSidebarKeepsOnlyVerticalScroll() {
  const source = await readSidebarStyleSource()

  assert.match(
    source,
    /\.sidebar \{[\s\S]*overflow-y:\s*auto;/,
    '左侧边栏需要继续保留纵向滚动，避免清单很多时内容被截断',
  )
  assert.match(
    source,
    /\.sidebar \{[\s\S]*overflow-x:\s*hidden;/,
    '左侧边栏应该禁止横向滚动，避免底部出现左右滚动条',
  )
}

async function main() {
  await testSidebarKeepsOnlyVerticalScroll()
  console.log('sidebar overflow regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
