import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

const removedMenuLabels = [
  '设置父任务',
  '设为里程碑',
  '添加前置任务',
  '添加后置任务',
  '查看历史记录',
  '取消任务',
  '举报',
]

async function testTaskTableMenuRemovesDeprecatedItems() {
  const source = await readSource('../src/components/TaskTable/index.tsx')
  const menuStart = source.indexOf('const moreMenu = {')
  const menuEnd = source.indexOf('return (', menuStart)
  const menuSource = source.slice(menuStart, menuEnd)

  for (const label of removedMenuLabels) {
    assert.doesNotMatch(
      menuSource,
      new RegExp(label),
      `主列表任务菜单不应该再出现“${label}”`,
    )
  }

  assert.match(
    menuSource,
    /label: '删除'/,
    '主列表任务菜单应该保留删除入口',
  )
}

async function testTaskDetailMenuRemovesDeprecatedItems() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const menuStart = source.indexOf('const moreMenu = {')
  const menuEnd = source.indexOf('const handleResizeStart', menuStart)
  const menuSource = source.slice(menuStart, menuEnd)

  for (const label of removedMenuLabels) {
    assert.doesNotMatch(
      menuSource,
      new RegExp(label),
      `任务详情页菜单不应该再出现“${label}”`,
    )
  }

  assert.match(
    menuSource,
    /label: '删除'/,
    '任务详情页菜单应该保留删除入口',
  )
}

async function main() {
  await testTaskTableMenuRemovesDeprecatedItems()
  await testTaskDetailMenuRemovesDeprecatedItems()
  console.log('task menu items regressions ok')
}

await main()
