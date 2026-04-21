import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testTaskRowDoesNotRenderPlusOrMoreActions() {
  const source = await readTaskTableSource()
  const taskRowStart = source.indexOf('function TaskRow(')
  const taskRowEnd = source.indexOf('function formatCustomFieldValue(')
  const taskRowSource = source.slice(taskRowStart, taskRowEnd)

  assert.doesNotMatch(
    taskRowSource,
    /className="cell cell-more"[\s\S]*icon={<PlusOutlined \/>}/,
    '每个任务行右侧不应该再渲染加号按钮',
  )
  assert.doesNotMatch(
    taskRowSource,
    /className="cell cell-more"[\s\S]*icon={<MoreOutlined \/>}/,
    '每个任务行右侧不应该再渲染三点菜单按钮',
  )
}

async function main() {
  await testTaskRowDoesNotRenderPlusOrMoreActions()
  console.log('task row actions regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
