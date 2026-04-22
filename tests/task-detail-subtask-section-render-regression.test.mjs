import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskDetailHidesTasklistSectionRow() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const primaryTasklistRef = task\.tasklists\[0\]/,
    '普通任务详情仍然要保留当前任务自己的 tasklists 解析逻辑',
  )

  assert.match(
    source,
    /\{currentTasklist && !isSubtask && \(/,
    '任务详情里的任务清单和分组行应该只给非子任务显示',
  )

  assert.doesNotMatch(
    source,
    /\{currentTasklist && \(/,
    '任务详情里的任务清单和分组行不应该对子任务继续裸渲染',
  )
}

async function main() {
  await testSubtaskDetailHidesTasklistSectionRow()
  console.log('task detail subtask section render regressions ok')
}

await main()
