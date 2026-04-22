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

async function testSectionGroupDropdownSupportsMultiSectionFiltering() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const \[visibleSectionGuids, setVisibleSectionGuids\] = useState<Set<string>>/,
    'TaskTable 需要维护任务分组筛选状态，支持只展示选中的几个分组',
  )
  assert.match(
    source,
    /const filteredSections = isSectionGroupMode\s*\?[\s\S]*visibleSectionGuids\.has\(section\.guid\)/,
    'TaskTable 在任务分组模式下应该先过滤分组，再生成 groupedTasks',
  )
  assert.doesNotMatch(
    source,
    /const handleSelectAllSections =|toggleVisibleSection\(/,
    '分组下拉里不应该再保留重复的“展示分组”复选区，避免和上方分组分类重复',
  )
}

async function testGroupDropdownUsesSerialMenuLayout() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /<div className="group-mode-list">[\s\S]*groupModeOptions\.map\(\(option\) => \(/,
    'TaskTable 分组下拉应该改成串行菜单列表，避免继续使用横向按钮宫格',
  )
  assert.match(
    source,
    /className=\{\`group-mode-item \$\{groupMode === option\.key \? 'group-mode-item-active' : ''\}`\}/,
    'TaskTable 分组下拉的菜单项应该有选中态 class，方便按参考图做当前项高亮',
  )
  assert.match(
    source,
    /<span className="group-mode-item-label">\{option\.label\}<\/span>/,
    'TaskTable 分组下拉的菜单项应该按一行一个标签串行展示',
  )
}

async function testGroupedTaskRowsUseSectionScopedKeys() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /key: `\$\{sectionGuid\}::\$\{task\.guid\}`/,
    'TaskTable 分组任务行 key 应该带上当前分组上下文，避免负责人分组切换时因为重复 key 叠加旧数据',
  )
  assert.doesNotMatch(
    source,
    /function buildTaskTreeRows[\s\S]*key: task\.guid,/,
    'TaskTable 分组任务行不应该继续直接使用 task.guid 作为统一表格行 key',
  )
}

async function main() {
  await testCreateButtonReferenceHasDefinition()
  await testSortMenuDoesNotExposeCustomDragOption()
  await testSectionGroupDropdownSupportsMultiSectionFiltering()
  await testGroupDropdownUsesSerialMenuLayout()
  await testGroupedTaskRowsUseSectionScopedKeys()
  console.log('task table toolbar regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
