import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testCreateButtonReferenceHasDefinition() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const firstCreatableSection = sectionSource\[0\]/,
    'TaskTable 工具栏创建菜单需要定义首个可创建分组，避免新建入口没有目标分组',
  )
  assert.match(
    source,
    /const createMenuItems =/,
    'TaskTable 工具栏引用创建菜单前必须先定义 createMenuItems',
  )
  assert.match(
    source,
    /const createButton =/,
    'TaskTable 工具栏渲染 {createButton} 前必须先定义 createButton，避免运行时 ReferenceError',
  )
}

async function testSortMenuDoesNotExposeCustomDragOption() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const visibleSortModes:\s*VisibleSortModeKey\[\]\s*=\s*\['due', 'start', 'created'\]/,
    'TaskTable 排序菜单应该只保留截止时间、开始时间、创建时间，避免再出现拖拽自定义选项',
  )
  assert.doesNotMatch(
    source,
    /const sortLabelMap: Record<SortModeKey, string> = \{\s*custom: '拖拽自定义'/m,
    'TaskTable 排序文案里不应该再保留拖拽自定义',
  )
}

async function main() {
  await testCreateButtonReferenceHasDefinition()
  await testSortMenuDoesNotExposeCustomDragOption()
  console.log('task table toolbar regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
