import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readEditorSource() {
  return readFile(new URL('../src/components/CustomFieldEditorModal/index.tsx', import.meta.url), 'utf8')
}

async function testExistingFieldTabOnlyAllowsPicking() {
  const source = await readEditorSource()
  const listStart = source.indexOf('const existingList = (')
  const listEnd = source.indexOf('return (', listStart)
  const listSource = source.slice(listStart, listEnd)

  assert.notEqual(
    listStart,
    -1,
    '自定义字段弹窗里应该保留已创建字段列表',
  )
  assert.doesNotMatch(
    listSource,
    /icon={<EditOutlined \/>}/,
    '已创建字段页签里不应该再提供编辑入口，只允许选择和使用',
  )
  assert.doesNotMatch(
    listSource,
    /handleDeleteExisting|删除该字段|icon={<DeleteOutlined \/>}/,
    '已创建字段页签里不应该再提供删除入口，只允许选择和使用',
  )
  assert.match(
    listSource,
    /搜索已创建的字段/,
    '已创建字段页签里应该提供搜索框，方便按字段名筛选',
  )
}

async function testExistingFieldTabUsesBottomConfirmButton() {
  const source = await readEditorSource()

  assert.match(
    source,
    /activeTab === 'existing'/,
    '弹窗 footer 应该区分已创建字段页签，单独渲染选择确认操作',
  )
  assert.match(
    source,
    /添加到清单/,
    '已创建字段页签底部应该提供“添加到清单”确认按钮',
  )
  assert.match(
    source,
    /disabled=\{!selectedExistingFieldId\}/,
    '未选中字段前，已创建字段页签的确认按钮应该禁用，避免误提交',
  )
}

async function main() {
  await testExistingFieldTabOnlyAllowsPicking()
  await testExistingFieldTabUsesBottomConfirmButton()
  console.log('custom field existing picker regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
