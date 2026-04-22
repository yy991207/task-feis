import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskDetailRefreshAlsoSyncsTasklists() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /void getTask\(task\.guid\)/,
    '任务详情打开后应该继续拉一次最新任务数据',
  )

  assert.match(
    source,
    /fresh\.tasklists\.length !== task\.tasklists\.length/,
    '如果接口返回的任务分组数量变化，详情页应该把最新任务回写给外层状态',
  )

  assert.match(
    source,
    /fresh\.tasklists\.some\(\(item, index\) => \{[\s\S]*const current = task\.tasklists\[index\][\s\S]*current\.tasklist_guid !== item\.tasklist_guid[\s\S]*current\.section_guid !== item\.section_guid/,
    '如果接口返回的 tasklists 里 tasklist_guid 或 section_guid 变化，详情页也应该触发回写',
  )

  assert.match(
    source,
    /onTaskUpdated\?\.\(fresh\)/,
    '详情页拿到接口最新任务后，分组差异应该继续复用 onTaskUpdated 同步到页面层',
  )
}

async function main() {
  await testTaskDetailRefreshAlsoSyncsTasklists()
  console.log('task detail section sync regressions ok')
}

await main()
