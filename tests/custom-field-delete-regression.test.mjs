import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readCustomFieldEditorModalSource() {
  return readFile(
    new URL('../src/components/CustomFieldEditorModal/index.tsx', import.meta.url),
    'utf8',
  )
}

async function testEditModeCanDeleteCurrentCustomField() {
  const source = await readCustomFieldEditorModalSource()

  assert.match(
    source,
    /const handleDeleteCurrentField = async \(\) => \{/,
    '编辑已有自定义字段时应该有单独的删除处理函数，不能只能保存不能删除',
  )
  assert.match(
    source,
    /await deleteCustomField\(field\.field_id\)/,
    '编辑已有自定义字段时应该调用 deleteCustomField 接入 DELETE /custom-fields/{field_id}',
  )
  assert.match(
    source,
    /onDeleted\?\.\(field\.field_id\)/,
    '删除已有自定义字段后应该继续通知父层刷新字段列表和可见列',
  )
  assert.match(
    source,
    /onClose\(\)/,
    '删除已有自定义字段成功后应该关闭当前编辑弹窗，避免停留在无效表单上',
  )
  assert.match(
    source,
    /title="删除该字段？"[\s\S]*okText="删除字段"/,
    '编辑已有自定义字段时应该提供明确的删除确认入口',
  )
}

async function main() {
  await testEditModeCanDeleteCurrentCustomField()
  console.log('custom field delete regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
