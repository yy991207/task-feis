import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskServiceUsesAssigneeIds() {
  const source = await readSource('../src/services/taskService.ts')

  assert.match(
    source,
    /assignee_ids\?: string\[\]/,
    '任务服务层的创建、更新和批量接口都应该支持 assignee_ids 入参',
  )
  assert.match(
    source,
    /body: JSON\.stringify\(\{ user_id: appConfig\.user_id, assignee_ids: assigneeIds }\)/,
    '负责人 PATCH 接口应该直接发送 assignee_ids，不能继续只发 assignee_id',
  )
  assert.match(
    source,
    /const apiAssigneeIds = Array\.from\(\s*new Set\(\[\.\.\.\(api\.assignee_ids \?\? \[\]\), \.\.\.\(api\.assignee_id \? \[api\.assignee_id\] : \[\]\)\]\),\s*\)/,
    '任务映射应该先兼容 assignee_ids，再兜底旧的 assignee_id',
  )
}

async function testSharedAssigneePickerSupportsMultipleUsers() {
  const source = await readSource('../src/components/UserSearchSelect/index.tsx')

  assert.match(
    source,
    /mode\?: 'multiple'/,
    '共享选人控件应该支持多选模式，给多负责人和关注人复用',
  )
  assert.match(
    source,
    /value\?: string \| string\[\]/,
    '共享选人控件的值类型应该同时兼容单选和多选',
  )
  assert.match(
    source,
    /if \(mode === 'multiple'\) \{[\s\S]*onChange\(nextSelectedIds\)/,
    '共享选人控件应该继续按 mode 支持多人选择，并回传完整人员数组',
  )
}

async function testTaskTableUsesMultiAssigneePicker() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /const assigneeIds = assignees\.map\(\(member\) => member\.id\)/,
    '主表负责人列应该以负责人数组为准，而不是只取第一个人',
  )
  assert.match(
    source,
    /onChange=\{\(value\) => void handleAssigneeChange\(value\)\}/,
    '主表负责人列应该把多选结果直接传给负责人更新函数',
  )
  assert.match(
    source,
    /mode="multiple"/,
    '主表负责人选择器应该切成多选模式',
  )
  assert.match(
    source,
    /<Avatar\.Group/,
    '主表负责人展示应该改成头像组，才能同时展示多个人',
  )
}

async function testDetailPanelUsesMultiAssigneePicker() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const handleAssigneeChange = async \(values: string\[\]\) => \{/,
    '详情页负责人更新函数应该直接接收多人数组',
  )
  assert.match(
    source,
    /await patchTaskAssignee\(task\.guid, nextAssigneeIds\)/,
    '详情页负责人更新应该发送完整 assignee_ids 数组',
  )
  assert.match(
    source,
    /mode="multiple"/,
    '详情页负责人选择器应该切成多选模式',
  )
  assert.match(
    source,
    /assignees\.map\(\(a\) => \(/,
    '详情页负责人展示应该遍历多人，而不是只看第一个负责人',
  )
}

async function main() {
  await testTaskServiceUsesAssigneeIds()
  await testSharedAssigneePickerSupportsMultipleUsers()
  await testTaskTableUsesMultiAssigneePicker()
  await testDetailPanelUsesMultiAssigneePicker()
  console.log('task multi assignee regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
