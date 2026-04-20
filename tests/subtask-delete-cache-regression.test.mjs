import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskListSource() {
  return readFile(new URL('../src/pages/TaskList.tsx', import.meta.url), 'utf8')
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
    /const updated = list\.flatMap/,
    '任务表格同步子任务缓存时，应该能过滤掉已从外部 tasks 删除的子任务',
  )
  assert.match(
    source,
    /if \(!fresh\) \{[\s\S]*changed = true[\s\S]*return \[\]/,
    '任务表格同步子任务缓存时，外部 tasks 已不存在的子任务应该从展开缓存移除',
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

async function main() {
  await testSubtaskCacheRemovesDeletedTasks()
  await testDeletingSubtaskUpdatesParentCount()
  console.log('subtask delete cache regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
