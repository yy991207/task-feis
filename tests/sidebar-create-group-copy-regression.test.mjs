import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarSource() {
  return readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8')
}

async function testSidebarCreateGroupCopy() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /新建清单分组/,
    '左侧边栏底部新建分组入口文案应该明确为“新建清单分组”',
  )
}

async function main() {
  await testSidebarCreateGroupCopy()
  console.log('sidebar create group copy regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
