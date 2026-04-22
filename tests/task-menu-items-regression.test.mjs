import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

const removedMenuLabels = [
  '设为里程碑',
  '添加前置任务',
  '添加后置任务',
  '取消任务',
  '举报',
]

async function testTaskTableSupportsParentTaskPatchFlow() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /const handleSetParentTaskAction = async \(task: Task, parentTaskId: string\) => \{/,
    '主列表应该继续保留设置父任务的处理函数',
  )
  assert.match(
    source,
    /message\.success\('已设置父任务'\)/,
    '主列表设置父任务成功后应该继续给出成功提示',
  )
  assert.match(
    source,
    /<TaskParentPickerModal[\s\S]*onSubmit=\{\(parentTaskId\) => \{/,
    '主列表应该继续挂载父任务选择弹层，方便别的入口复用设置父任务能力',
  )

  for (const label of removedMenuLabels) {
    assert.doesNotMatch(
      source,
      new RegExp(label),
      `主列表源码里不应该再回带“${label}”相关旧菜单文案`,
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
  assert.doesNotMatch(
    source,
    /Tooltip title="更多操作"/,
    '任务详情页三点按钮不应该再显示“更多操作”浮窗提示',
  )
  assert.doesNotMatch(
    source,
    /TaskParentPickerModal/,
    '任务详情页删除设置父任务入口后，不应该继续挂载父任务选择弹层',
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
  await testTaskTableSupportsParentTaskPatchFlow()
  await testTaskDetailMenuKeepsDetachAndDeleteItems()
  await testUpdateTaskApiSupportsParentTaskPatch()
  console.log('task menu items regressions ok')
}

await main()
