import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskListSource() {
  return readFile(new URL('../src/pages/TaskList.tsx', import.meta.url), 'utf8')
}

async function readDetailPanelSource() {
  return readFile(new URL('../src/components/TaskDetailPanel/index.tsx', import.meta.url), 'utf8')
}

async function testSubtaskCacheRemovesDeletedTasks() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const taskByGuid = new Map\(tasks\.map\(\(item\) => \[item\.guid, item\]\)\)/,
    '任务表格同步子任务缓存时，应该先按外部 tasks 建立最新任务索引',
  )
  assert.match(
    source,
    /const cachedChildren = list\.flatMap/,
    '任务表格同步子任务缓存时，应该能过滤掉已从外部 tasks 删除的子任务',
  )
  assert.match(
    source,
    /if \(!fresh\) \{[\s\S]*changed = true[\s\S]*return \[\]/,
    '任务表格同步子任务缓存时，外部 tasks 已不存在的子任务应该从展开缓存移除',
  )
}

async function testSubtaskCacheAddsCreatedTasks() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const childrenByParent = new Map<string, Task\[\]>\(\)/,
    '任务表格同步子任务缓存时，应该按 parent_task_guid 收集外部新增的子任务',
  )
  assert.match(
    source,
    /const externalChildren = childrenByParent\.get\(pid\) \?\? \[\]/,
    '任务表格同步已展开父任务缓存时，应该读取外部 tasks 里的最新子任务列表',
  )
  assert.match(
    source,
    /for \(const child of externalChildren\)/,
    '任务表格同步已展开父任务缓存时，应该把外部新增子任务合并进展开缓存',
  )
}

async function testDeletingSubtaskUpdatesParentCount() {
  const source = await readTaskListSource()

  assert.match(
    source,
    /const deletedTask = prev\.find\(\(task\) => task\.guid === taskGuid\)/,
    '删除任务时应该先在本地 tasks 中找到被删除任务，才能知道它是不是子任务',
  )
  assert.match(
    source,
    /deletedTask\?\.parent_task_guid/,
    '删除子任务时应该根据 parent_task_guid 找到父任务',
  )
  assert.match(
    source,
    /subtask_count: Math\.max\(0, task\.subtask_count - 1\)/,
    '删除子任务后应该本地递减父任务 subtask_count，避免父行继续显示 0/1 和展开入口',
  )
}

async function testDeletingParentTaskRemovesDescendantsFromOuterTasks() {
  const source = await readTaskListSource()

  assert.match(
    source,
    /const removedTaskGuidSet = new Set\(\[taskGuid\]\)/,
    '删除任务时应该先把当前任务放进待清理集合，给级联清理子任务做准备',
  )
  assert.match(
    source,
    /while \(changed\) \{/,
    '删除父任务时应该迭代收集所有后代任务，避免只删掉父任务本身',
  )
  assert.match(
    source,
    /if \(task\.parent_task_guid && removedTaskGuidSet\.has\(task\.parent_task_guid\)\) \{/,
    '删除父任务时，父任务的所有子任务和更深层后代都应该一起从本地 tasks 移除',
  )
}

async function testCreatingSubtaskUpdatesOuterTasks() {
  const source = await readTaskListSource()

  assert.match(
    source,
    /const handleSubtaskCreated = useCallback/,
    '任务详情创建子任务后，页面层应该有专门回调同步主列表状态',
  )
  assert.match(
    source,
    /setTasks\(\(prev\) => \[createdTask, \.\.\.prev\]\)/,
    '任务详情创建子任务后，页面层应该立即把新子任务写入外部 tasks',
  )
  assert.match(
    source,
    /getTask\(createdTask\.parent_task_guid\)/,
    '任务详情创建子任务后，页面层应该重新拉取父任务，刷新父任务 subtask_count',
  )
}

async function testCreatingSubtaskExpandsParentInMainTable() {
  const taskListSource = await readTaskListSource()
  const taskTableSource = await readTaskTableSource()

  assert.match(
    taskListSource,
    /const \[pendingExpandTaskGuid, setPendingExpandTaskGuid\] = useState<string \| null>\(null\)/,
    '任务详情创建子任务后，页面层应该记录待展开父任务 id',
  )
  assert.match(
    taskListSource,
    /setPendingExpandTaskGuid\(createdTask\.parent_task_guid\)/,
    '任务详情创建子任务后，页面层应该把父任务标记为待展开',
  )
  assert.match(
    taskListSource,
    /pendingExpandTaskGuid=\{pendingExpandTaskGuid\}/,
    '页面层应该把待展开父任务 id 传给 TaskTable',
  )
  assert.match(
    taskTableSource,
    /pendingExpandTaskGuid\?: string \| null/,
    'TaskTable 应该接收待展开父任务 id',
  )
  assert.match(
    taskTableSource,
    /setExpandedTaskGuids\(\(prev\) =>/,
    'TaskTable 收到待展开父任务 id 后应该更新展开集合',
  )
  assert.match(
    taskTableSource,
    /onPendingExpandConsumed\?\.\(pendingExpandTaskGuid\)/,
    'TaskTable 处理完待展开父任务后应该通知页面层消费该信号',
  )
}

async function testTogglingSubtaskStatusSyncsOuterTasks() {
  const detailSource = await readDetailPanelSource()
  const taskListSource = await readTaskListSource()

  assert.match(
    detailSource,
    /const handleToggleSubtaskStatus = async \(subtask: Task\) => \{/,
    '任务详情里应该有独立的子任务状态切换处理函数',
  )
  assert.match(
    detailSource,
    /const next = apiTaskToTask\(apiTask\)/,
    '子任务状态切换成功后应该先把接口返回结果转成前端 Task',
  )
  assert.match(
    detailSource,
    /onTaskUpdated\?\.\(next\)/,
    '子任务状态切换成功后应该把更新后的子任务同步给页面层外部 tasks',
  )
  assert.match(
    taskListSource,
    /const updateTaskInState = useCallback\(.*const exists = prev\.some\(\(task\) => task\.guid === nextTask\.guid\)/s,
    '页面层收到子任务更新后，应该复用统一的 updateTaskInState 回写外部 tasks',
  )
}

async function main() {
  await testSubtaskCacheRemovesDeletedTasks()
  await testSubtaskCacheAddsCreatedTasks()
  await testDeletingSubtaskUpdatesParentCount()
  await testDeletingParentTaskRemovesDescendantsFromOuterTasks()
  await testCreatingSubtaskUpdatesOuterTasks()
  await testCreatingSubtaskExpandsParentInMainTable()
  await testTogglingSubtaskStatusSyncsOuterTasks()
  console.log('subtask delete cache regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
