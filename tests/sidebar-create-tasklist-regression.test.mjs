import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarSource() {
  return readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8')
}

async function testSidebarCreateButtonDoesNotRenderTemplateMenu() {
  const source = await readSidebarSource()

  assert.doesNotMatch(
    source,
    /const buildCreateMenu =/,
    '左侧新增清单不应该再构造“空白清单/使用模板”子菜单',
  )
  assert.doesNotMatch(
    source,
    /label: '空白清单'|label: '使用模板'/,
    '左侧新增清单入口不应该再展示两个子菜单项',
  )
}

async function testSidebarCreateButtonDefaultsToBlankTasklist() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\)\s*void startCreateTasklist\(group\.group_id\)\s*\}\}/,
    '分组右侧加号应该直接创建空白清单，不再先打开创建菜单',
  )
  assert.match(
    source,
    /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\)\s*void startCreateTasklist\('root'\)\s*\}\}/,
    '任务清单根节点加号应该直接创建空白清单，不再先打开创建菜单',
  )
}

async function main() {
  await testSidebarCreateButtonDoesNotRenderTemplateMenu()
  await testSidebarCreateButtonDefaultsToBlankTasklist()
  console.log('sidebar create tasklist regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
