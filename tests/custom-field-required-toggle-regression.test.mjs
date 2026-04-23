import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readCustomFieldEditorModalSource() {
  return readFile(
    new URL('../src/components/CustomFieldEditorModal/index.tsx', import.meta.url),
    'utf8',
  )
}

async function readCustomFieldsModalSource() {
  return readFile(
    new URL('../src/components/CustomFieldsModal/index.tsx', import.meta.url),
    'utf8',
  )
}

async function testEditorModalDoesNotRenderRequiredToggle() {
  const source = await readCustomFieldEditorModalSource()

  assert.doesNotMatch(
    source,
    /<Form\.Item label="是否必填">/,
    '新字段编辑弹窗里不应该再渲染“是否必填”这一行',
  )
  assert.doesNotMatch(
    source,
    /开启后该字段必须填写/,
    '新字段编辑弹窗里不应该再保留“开启后该字段必须填写”的提示文案',
  )
  assert.doesNotMatch(
    source,
    /import Switch from 'antd\/es\/switch'/,
    '新字段编辑弹窗不需要再依赖 Switch 组件',
  )
}

async function testLegacyModalDoesNotRenderRequiredToggle() {
  const source = await readCustomFieldsModalSource()

  assert.doesNotMatch(
    source,
    /<Form\.Item name="required" label="是否必填" valuePropName="checked">/,
    '旧字段配置弹窗里也不应该再渲染“是否必填”开关',
  )
  assert.doesNotMatch(
    source,
    /import Switch from 'antd\/es\/switch'/,
    '旧字段配置弹窗不需要再依赖 Switch 组件',
  )
}

async function main() {
  await testEditorModalDoesNotRenderRequiredToggle()
  await testLegacyModalDoesNotRenderRequiredToggle()
  console.log('custom field required toggle regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
