import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testRequestSupportsEmptySuccessResponse() {
  const source = await readSource('../src/services/request.ts')

  assert.match(
    source,
    /const rawText = await res\.text\(\)/,
    '请求封装应该先读原始响应文本，兼容后端返回空响应体的成功场景',
  )
  assert.match(
    source,
    /if \(!rawText\.trim\(\)\) \{/,
    '请求封装遇到空响应体时应该直接返回，不能强行按 JSON 解析',
  )
  assert.match(
    source,
    /return undefined as T/,
    '空响应体的成功请求应该返回 undefined，避免 DELETE 接口因为 JSON 解析报错',
  )
}

async function testFilePreviewResetsLoadingWhenDisabled() {
  const source = await readSource('../src/components/file-preview/use-file-content.ts')

  assert.match(
    source,
    /if \(!enabled\) \{/,
    '文件预览 hook 关闭时应该有单独的兜底分支',
  )
  assert.match(
    source,
    /abortRef\.current\?\.abort\(\)/,
    '文件预览 hook 关闭时应该先中断上一次还没结束的请求，避免旧请求回写状态',
  )
  assert.match(
    source,
    /setLoading\(false\)/,
    '文件预览 hook 关闭时应该立刻清掉 loading，避免预览面板一直显示加载中',
  )
}

async function main() {
  await testRequestSupportsEmptySuccessResponse()
  await testFilePreviewResetsLoadingWhenDisabled()
  console.log('request and file preview regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
