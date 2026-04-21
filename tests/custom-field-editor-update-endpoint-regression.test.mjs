import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readCustomFieldEditorModalSource() {
  return readFile(
    new URL('../src/components/CustomFieldEditorModal/index.tsx', import.meta.url),
    'utf8',
  )
}

async function testExistingFieldUsesFieldScopedUpdateApi() {
  const source = await readCustomFieldEditorModalSource()

  const editBranchIndex = source.indexOf('if (isEdit && field) {')
  const updateCallIndex = source.indexOf('saved = await updateCustomField(field.field_id, {')
  const createCallIndex = source.indexOf('saved = await createCustomField(projectId, {')

  assert.notEqual(
    editBranchIndex,
    -1,
    '自定义字段编辑弹窗应该保留编辑已有字段的分支判断',
  )
  assert.notEqual(
    updateCallIndex,
    -1,
    '编辑已有自定义字段时，保存逻辑应该调用 updateCustomField(field.field_id, ...)',
  )
  assert.notEqual(
    createCallIndex,
    -1,
    '新建自定义字段时，保存逻辑应该调用 createCustomField(projectId, ...)',
  )
  assert.ok(
    editBranchIndex < updateCallIndex && updateCallIndex < createCallIndex,
    '编辑已有自定义字段时应该先进入字段级更新分支，新建字段时才进入项目级创建分支',
  )
}

async function main() {
  await testExistingFieldUsesFieldScopedUpdateApi()
  console.log('custom field editor update endpoint regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
