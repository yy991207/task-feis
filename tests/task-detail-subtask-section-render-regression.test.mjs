import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskDetailUsesCurrentTaskTasklists() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const primaryTasklistRef = task\.tasklists\[0\]/,
    '子任务详情的任务清单应该直接跟当前任务自己的 tasklists 走',
  )

  assert.match(
    source,
    /const currentTasklistRefs = task\.tasklists\.filter\(\s*\(item\) => item\.tasklist_guid === currentTasklist\?\.guid,\s*\)/,
    '子任务详情展示分组时应该直接读取当前任务自己的 tasklists',
  )

  assert.match(
    source,
    /await moveTaskToSection\(task\.guid, sectionGuid\)/,
    '点击候选分组后应该直接走任务分组切换接口',
  )

  assert.match(
    source,
    /message\.success\('已切换任务分组'\)/,
    '切换任务分组成功后应该给出明确的切换成功提示',
  )

  assert.doesNotMatch(
    source,
    /const tasklistOwner = isSubtask && rootParentTask \? rootParentTask : task/,
    '子任务详情不应该再把顶级父任务当成分组展示来源',
  )
}

async function main() {
  await testSubtaskDetailUsesCurrentTaskTasklists()
  console.log('task detail subtask section render regressions ok')
}

await main()
