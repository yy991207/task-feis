import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testDetailPanelCreatesSubtaskWithParentStart() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const parentStart = task\.start\?\.timestamp[\s\S]*new Date\(Number\(task\.start\.timestamp\)\)\.toISOString\(\)/,
    '任务详情创建子任务时，应该把父任务开始时间转成接口需要的 start_date',
  )
  assert.match(
    source,
    /start_date: parentStart/,
    '任务详情创建子任务时，接口 payload 应该带上父任务开始时间',
  )
}

async function testDetailPanelDisplaysSubtasksWithParentStart() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /import \{ inheritParentStartForTasks \} from '@\/utils\/taskDate'/,
    '任务详情应该复用子任务开始时间继承工具',
  )
  assert.match(
    source,
    /setSubtaskDrafts\(inheritParentStartForTasks\(items\.map\(\(t\) => apiTaskToTask\(t\)\), task\)\)/,
    '任务详情加载子任务列表时，应该用父任务开始时间覆盖子任务开始时间',
  )
  assert.match(
    source,
    /const createdTask = inheritParentStartForTasks\(\[apiTaskToTask\(apiTask\)\], task\)\[0\]/,
    '任务详情创建子任务成功后，本地新增的子任务也应该继承父任务开始时间',
  )
}

async function testTaskTableDisplaysSubtasksWithParentStart() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /import \{ inheritParentStartForTasks \} from '@\/utils\/taskDate'/,
    '任务表格应该复用子任务开始时间继承工具',
  )
  assert.match(
    source,
    /inheritParentStartForTasks\(items\.map\(\(t\) => apiTaskToTask\(t\)\), parent\)/,
    '任务表格手动展开父任务时，接口返回的子任务应该继承当前父任务开始时间',
  )
  assert.match(
    source,
    /inheritParentStartForTasks\(items\.map\(\(t\) => apiTaskToTask\(t\)\), parentTask\)/,
    '任务表格自动展开父任务时，接口返回的子任务应该继承当前父任务开始时间',
  )
}

async function testInheritanceUtilityKeepsParentStartAsSourceOfTruth() {
  const source = await readSource('../src/utils/taskDate.ts')

  assert.match(
    source,
    /export function inheritParentStartForTasks/,
    '应该提供统一的子任务开始时间继承工具',
  )
  assert.match(
    source,
    /if \(!task\.parent_task_guid\) \{/,
    '父任务本身不应该被继承逻辑改动',
  )
  assert.match(
    source,
    /start: parent\.start \? \{ \.\.\.parent\.start \} : undefined/,
    '子任务开始时间应该始终以父任务 start 为准',
  )
}

async function main() {
  await testDetailPanelCreatesSubtaskWithParentStart()
  await testDetailPanelDisplaysSubtasksWithParentStart()
  await testTaskTableDisplaysSubtasksWithParentStart()
  await testInheritanceUtilityKeepsParentStartAsSourceOfTruth()
  console.log('subtask start inheritance regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
