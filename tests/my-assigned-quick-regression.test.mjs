import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testMyAssignedQuickUsesCreatorFilter() {
  const source = await readSource('../src/pages/TaskList.tsx')

  assert.match(
    source,
    /case 'my-assigned-quick':[\s\S]*params\.creator_id = currentUserId/,
    '我分配的页面应该继续先按当前创建人拉任务，保证只看“我创建”的任务',
  )
}

async function testMyAssignedQuickHandlesMultiAssigneeTasks() {
  const source = await readSource('../src/pages/TaskList.tsx')

  assert.match(
    source,
    /activeNav === 'my-assigned-quick'[\s\S]*assignee_ids\s*\?\?\s*\[\]/,
    '我分配的页面筛选已分配任务时，必须兼容后端只返回 assignee_ids 的情况',
  )
  assert.doesNotMatch(
    source,
    /activeNav === 'my-assigned-quick'[\s\S]*items\.filter\(\(t\) => t\.assignee_id != null\)/,
    '我分配的页面不能再只靠 assignee_id 过滤，否则多负责人数据会被整页过滤空',
  )
}

async function main() {
  await testMyAssignedQuickUsesCreatorFilter()
  await testMyAssignedQuickHandlesMultiAssigneeTasks()
  console.log('my assigned quick regressions ok')
}

await main()
