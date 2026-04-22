import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function testTaskServiceUsesIsCompletedFromApi() {
  const taskServiceSource = await readSource('../src/services/taskService.ts')

  assert.match(
    taskServiceSource,
    /is_completed: boolean/,
    '任务接口模型应该接住新的 is_completed 字段，不能继续只依赖旧的 status 值判断完成态',
  )
  assert.match(
    taskServiceSource,
    /function normalizeTaskStatus\(status: string, isCompleted: boolean\): Task\['status'\]/,
    '任务状态归一化应该同时拿到 status 和 is_completed，兼容新的完成态返回结构',
  )
  assert.match(
    taskServiceSource,
    /if \(isCompleted\) \{\s*return 'done'\s*\}/,
    '接口只要返回 is_completed=true，前端任务状态就应该映射成 done',
  )
  assert.match(
    taskServiceSource,
    /status: normalizeTaskStatus\(api\.status,\s*api\.is_completed\)/,
    'apiTaskToTask 应该优先用 is_completed 决定任务是否完成，不能继续只看 status',
  )
}

async function testCheckboxesStillReadMappedTaskStatus() {
  const tableSource = await readSource('../src/components/TaskTable/index.tsx')
  const detailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    tableSource,
    /checked=\{task\.status === 'done'\}/,
    '主视图任务勾选框应该继续读映射后的 task.status，服务层兼容后这里不需要额外分叉判断 is_completed',
  )
  assert.match(
    detailSource,
    /checked=\{task\.status === 'done'\}/,
    '详情页当前任务勾选框应该继续读映射后的 task.status，保持交互最小改动',
  )
}

async function main() {
  await testTaskServiceUsesIsCompletedFromApi()
  await testCheckboxesStillReadMappedTaskStatus()
  console.log('task completion flag regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
