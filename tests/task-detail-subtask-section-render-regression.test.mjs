import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskDetailUsesRootParentSectionForDisplay() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const rootParentTask = parentTaskChain\[0\]/,
    '子任务详情应该拿到父任务链里的顶级父任务，给任务清单和分组展示复用',
  )

  assert.match(
    source,
    /const tasklistOwner = isSubtask && rootParentTask \? rootParentTask : task/,
    '子任务详情展示分组时应该优先沿用顶级父任务的任务清单引用，和主表分组保持一致',
  )

  assert.match(
    source,
    /const primaryTasklistRef = tasklistOwner\.tasklists\[0\]/,
    '任务详情当前清单来源应该改成 tasklistOwner，而不是始终直接读当前任务 tasklists[0]',
  )

  assert.doesNotMatch(
    source,
    /const primaryTasklistRef = task\.tasklists\[0\]/,
    '子任务详情不能再固定使用当前任务自己的 tasklists[0] 作为分组展示来源',
  )
}

async function main() {
  await testSubtaskDetailUsesRootParentSectionForDisplay()
  console.log('task detail subtask section render regressions ok')
}

await main()
