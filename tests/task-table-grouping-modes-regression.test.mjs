import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testTaskTableSupportsExtendedGroupingModes() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /type BaseGroupModeKey = 'section' \| 'none' \| 'assignee' \| 'start' \| 'due' \| 'creator'/,
    'TaskTable 分组模式应该扩展到负责人、开始时间、截止时间、创建人',
  )
  assert.match(
    source,
    /type CustomFieldGroupModeKey = `custom:\$\{string\}`/,
    'TaskTable 分组模式应该支持自定义字段 key，给单选和多选字段分组复用',
  )
  assert.match(
    source,
    /const groupableCustomFields = \(tasklist\?\.custom_fields \?\? \[\]\)\.filter\(\s*\(field\) => field\.type === 'single_select' \|\| field\.type === 'multi_select'/,
    'TaskTable 分组菜单应该把单选和多选自定义字段加入可选分组项',
  )
}

async function testTaskTableDefinesDateGroupingBuckets() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const startDateGroupDefinitions = \[[\s\S]*已开始[\s\S]*今天[\s\S]*明天[\s\S]*未来 7 天[\s\S]*以后[\s\S]*未安排[\s\S]*\]/,
    '开始时间分组应该固定展示已开始、今天、明天、未来 7 天、以后、未安排这些分组桶',
  )
  assert.match(
    source,
    /const dueDateGroupDefinitions = \[[\s\S]*已逾期[\s\S]*今天[\s\S]*明天[\s\S]*未来 7 天[\s\S]*以后[\s\S]*未安排[\s\S]*\]/,
    '截止时间分组应该固定展示已逾期、今天、明天、未来 7 天、以后、未安排这些分组桶',
  )
  assert.match(
    source,
    /function getDateGroupKey\(field: 'start' \| 'due', task: Task\)/,
    'TaskTable 应该抽出统一的日期分组归类函数，避免开始时间和截止时间各写一套',
  )
}

async function testTaskTableBuildsGroupedTasksForSystemAndCustomFields() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const isSectionGroupMode = groupMode === 'section'/,
    'TaskTable 应该区分任务分组和其他分组模式，避免非任务分组时沿用 section 逻辑',
  )
  assert.match(
    source,
    /function buildGroupedTasksByMode\(/,
    'TaskTable 应该把 groupedTasks 生成逻辑收口成统一函数，给不同分组模式复用',
  )
  assert.match(
    source,
    /case 'assignee':[\s\S]*case 'start':[\s\S]*case 'due':[\s\S]*case 'creator':/,
    'TaskTable 统一分组函数里应该覆盖负责人、开始时间、截止时间、创建人这些系统分组',
  )
  assert.match(
    source,
    /if \(groupMode\.startsWith\('custom:'\)\)/,
    'TaskTable 统一分组函数里应该支持自定义字段分组',
  )
  assert.match(
    source,
    /fieldValue\?\.multi_select_value \?\? \[\]/,
    '自定义字段分组应该能读取多选字段的选项集合',
  )
  assert.match(
    source,
    /fieldValue\?\.single_select_value \? \[fieldValue\.single_select_value\] : \[\]/,
    '自定义字段分组应该能读取单选字段的选项值',
  )
}

async function main() {
  await testTaskTableSupportsExtendedGroupingModes()
  await testTaskTableDefinesDateGroupingBuckets()
  await testTaskTableBuildsGroupedTasksForSystemAndCustomFields()
  console.log('task table grouping mode regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
