import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testFilterFieldDefinitionsExcludeTaskSourceFields() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const systemFilterFieldConfigs: FilterFieldConfig\[\] = \[/,
    '筛选模块应该显式维护一级分类字段配置，避免直接复用表格列导致字段混乱',
  )
  assert.match(
    source,
    /key: 'assignee'[\s\S]*label: '负责人'[\s\S]*type: 'member'/,
    '一级分类应该包含负责人，并按人员字段处理',
  )
  assert.match(
    source,
    /key: 'start'[\s\S]*label: '开始时间'[\s\S]*type: 'date'/,
    '一级分类应该包含开始时间，并按日期字段处理',
  )
  assert.match(
    source,
    /key: 'due'[\s\S]*label: '截止时间'[\s\S]*type: 'date'/,
    '一级分类应该包含截止时间，并按日期字段处理',
  )
  assert.match(
    source,
    /key: 'completed'[\s\S]*label: '完成时间'[\s\S]*type: 'date'/,
    '一级分类应该包含完成时间，并按日期字段处理',
  )
  assert.match(
    source,
    /key: 'assigner'[\s\S]*label: '分配人'[\s\S]*type: 'member'/,
    '一级分类应该包含分配人，并按人员字段处理',
  )
  assert.match(
    source,
    /key: 'followers'[\s\S]*label: '关注人'[\s\S]*type: 'member'/,
    '一级分类应该包含关注人，并按人员字段处理',
  )
  assert.match(
    source,
    /key: 'creator'[\s\S]*label: '创建人'[\s\S]*type: 'member'/,
    '一级分类应该包含创建人，并按人员字段处理',
  )
  assert.doesNotMatch(
    source,
    /systemFilterFieldConfigs[\s\S]*key: 'taskSource'/,
    '任务来源暂时不用做，不能进入筛选一级分类',
  )
  assert.doesNotMatch(
    source,
    /systemFilterFieldConfigs[\s\S]*key: 'sourceCategory'/,
    '来源类别暂时不用做，不能进入筛选一级分类',
  )
}

async function testCustomFieldFilterDefinitionsDependOnFieldType() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /function buildCustomFilterFieldConfig\(field: CustomFieldDef\): FilterFieldConfig/,
    '自定义字段应该通过字段类型转换成筛选一级分类，而不是全部当文本处理',
  )
  assert.match(
    source,
    /field\.type === 'single_select' \|\| field\.type === 'select'/,
    '单选自定义字段筛选应该按 select 类型展示所有选项',
  )
  assert.match(
    source,
    /field\.type === 'multi_select'/,
    '多选自定义字段筛选应该按 multiSelect 类型展示所有选项',
  )
  assert.match(
    source,
    /field\.type === 'member'/,
    '人员自定义字段筛选应该按 member 类型展示用户列表',
  )
  assert.match(
    source,
    /field\.type === 'number'/,
    '数值自定义字段筛选应该按 number 类型展示数值条件',
  )
  assert.match(
    source,
    /field\.type === 'datetime' \|\| field\.type === 'date'/,
    '日期自定义字段筛选应该按 date 类型展示日期条件',
  )
}

async function testOperatorDefinitionsMatchFieldType() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const dateFilterOperators[\s\S]*label: '等于'[\s\S]*label: '早于'[\s\S]*label: '晚于'[\s\S]*label: '介于'[\s\S]*label: '为空'[\s\S]*label: '不为空'/,
    '日期字段二级分类应该支持等于、早于、晚于、介于、为空和不为空',
  )
  assert.match(
    source,
    /const containsFilterOperators[\s\S]*label: '包含'[\s\S]*label: '不包含'[\s\S]*label: '为空'[\s\S]*label: '不为空'/,
    '人员、文本、单选和多选字段二级分类应该支持包含、不包含、为空和不为空',
  )
  assert.match(
    source,
    /const numberFilterOperators[\s\S]*label: '等于'[\s\S]*label: '不等于'[\s\S]*label: '小于'[\s\S]*label: '小于等于'[\s\S]*label: '大于'[\s\S]*label: '大于等于'[\s\S]*label: '为空'[\s\S]*label: '不为空'/,
    '数值字段二级分类应该支持比较类条件',
  )
}

async function testFilterRowsUseAndLogicByDefault() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const \[filterConditions, setFilterConditions\] = useState<FilterCondition\[\]>/,
    '筛选模块应该用条件数组维护多行筛选状态',
  )
  assert.match(
    source,
    /index === 0 \? '当' : '且'/,
    '筛选面板多条件默认应该展示“且”的串联逻辑',
  )
  assert.match(
    source,
    /activeFilterConditions\.every\(\(condition\) => matchTaskFilterCondition\(task, condition, filterFieldConfigMap\)\)/,
    '任务过滤计算应该默认按且逻辑执行，所有条件都满足才展示',
  )
  assert.match(
    source,
    /const activeFilterCount = activeFilterConditions\.length/,
    '工具栏筛选角标应该显示当前有效筛选条件数量',
  )
}

async function testFilterPanelRendersTypedValueControls() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /function renderFilterValueControl\(condition: FilterCondition\)/,
    '筛选面板应该按字段类型渲染第三段值控件',
  )
  assert.match(
    source,
    /<UserSearchSelect[\s\S]*mode="multiple"[\s\S]*placeholder="请选择"/,
    '人员类筛选值应该复用用户搜索选择控件，并支持多选',
  )
  assert.match(
    source,
    /field\.options\.map\(\(option\) => \(/,
    '单选和多选自定义字段筛选值应该展示字段里的所有选项',
  )
  assert.match(
    source,
    /<DatePicker[\s\S]*placeholder="请选择日期"/,
    '日期类筛选值应该展示日期选择器',
  )
  assert.match(
    source,
    /<Input[\s\S]*placeholder="请输入"/,
    '文本和数值类筛选值应该提供输入框',
  )
}

async function main() {
  await testFilterFieldDefinitionsExcludeTaskSourceFields()
  await testCustomFieldFilterDefinitionsDependOnFieldType()
  await testOperatorDefinitionsMatchFieldType()
  await testFilterRowsUseAndLogicByDefault()
  await testFilterPanelRendersTypedValueControls()
  console.log('task table filter regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
