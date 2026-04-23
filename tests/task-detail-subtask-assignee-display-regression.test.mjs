import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testAssignedSubtaskShowsAvatarOnly() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /className="subtask-meta-trigger subtask-assignee-trigger"[\s\S]*<Avatar\.Group size=\{20\} max=\{\{ count: 3 \}\}>/,
    '子任务负责人入口在已分配时应该继续显示头像组',
  )

  assert.doesNotMatch(
    source,
    /className="subtask-meta-trigger subtask-assignee-trigger"[\s\S]*assigneeUsers\.map\(getUserDisplayName\)\.join\('、'\)/,
    '子任务负责人入口在已分配时不应该再常驻显示名字，只保留头像和悬浮提示',
  )
}

async function testUnassignedSubtaskKeepsPlaceholder() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /<UserOutlined \/>[\s\S]*<span className="subtask-assignee-name">负责人<\/span>/,
    '子任务没有负责人时，入口仍然应该显示“负责人”占位',
  )
}

async function main() {
  await testAssignedSubtaskShowsAvatarOnly()
  await testUnassignedSubtaskKeepsPlaceholder()
  console.log('task detail subtask assignee display regressions ok')
}

await main()
