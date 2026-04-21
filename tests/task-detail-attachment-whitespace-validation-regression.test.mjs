import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function main() {
  const attachmentServiceSource = await readSource('../src/services/attachmentService.ts')
  const detailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const richInputSource = await readSource('../src/components/TaskRichInput/index.tsx')

  assert.doesNotMatch(
    attachmentServiceSource,
    /getAttachmentFileNameValidationError/,
    '附件服务不应该再保留文件名空格校验 helper',
  )
  assert.doesNotMatch(
    detailSource,
    /getAttachmentFileNameValidationError\(file\.name\)/,
    '任务详情上传附件入口不应该再拦截文件名空格',
  )
  assert.doesNotMatch(
    richInputSource,
    /getAttachmentFileNameValidationError\(file\.name\)/,
    '统一富文本输入框上传附件时不应该再拦截文件名空格',
  )
  assert.doesNotMatch(
    attachmentServiceSource,
    /文件名包含空格，请修改名称后再上传/,
    '上传流程不应该再提示文件名空格非法',
  )

  console.log('task detail attachment whitespace validation regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
