import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

const removedMenuLabels = [
  '设为里程碑',
  '添加前置任务',
  '添加后置任务',
  '查看历史记录',
  '取消任务',
  '举报',
]

async function testTaskTableMenuKeepsParentAndDeleteItems() {
  const source = await readSource('../src/components/TaskTable/index.tsx')
  const menuStart = source.indexOf('const moreMenu = {')
  const menuEnd = source.indexOf('return (', menuStart)
  const menuSource = source.slice(menuStart, menuEnd)

  assert.match(
    menuSource,
    /label: '设置父任务'/,
    '主列表任务菜单应该保留“设置父任务”入口',
  )
  assert.match(
    menuSource,
    /label: '删除'/,
    '主列表任务菜单应该保留删除入口',
  )
  assert.match(
    menuSource,
    /task\.parent_task_guid[\s\S]*label: '设为独立任务'/,
    '主列表任务菜单应该只在子任务场景下提供“设为独立任务”',
  )

  for (const label of removedMenuLabels) {
    assert.doesNotMatch(
      menuSource,
      new RegExp(label),
      `主列表任务菜单不应该再出现“${label}”`,
    )
  }
}

async function testTaskDetailMenuKeepsDetachAndDeleteItems() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const menuStart = source.indexOf('const moreMenu = {')
  const menuEnd = source.indexOf('const handleResizeStart', menuStart)
  const menuSource = source.slice(menuStart, menuEnd)

  assert.doesNotMatch(
    menuSource,
    /label: '设置父任务'/,
    '任务详情页菜单不应该再出现“设置父任务”入口',
  )
  assert.match(
    menuSource,
    /label: '删除'/,
    '任务详情页菜单应该保留删除入口',
  )
  assert.match(
    menuSource,
    /task\.parent_task_guid[\s\S]*label: '设为独立任务'/,
    '任务详情页菜单应该只在子任务场景下提供“设为独立任务”',
  )

  for (const label of removedMenuLabels) {
    assert.doesNotMatch(
      menuSource,
      new RegExp(label),
      `任务详情页菜单不应该再出现“${label}”`,
    )
  }
}

async function testUpdateTaskApiSupportsParentTaskPatch() {
  const source = await readSource('../src/services/taskService.ts')

  assert.match(
    source,
    /parent_task_id\?: string \| null/,
    'updateTaskApi 的 patch 类型应该支持 parent_task_id，方便设置父任务和设为独立任务',
  )
}

async function main() {
  await testTaskTableMenuKeepsParentAndDeleteItems()
  await testTaskDetailMenuKeepsDetachAndDeleteItems()
  await testUpdateTaskApiSupportsParentTaskPatch()
  console.log('task menu items regressions ok')
}

await main()
