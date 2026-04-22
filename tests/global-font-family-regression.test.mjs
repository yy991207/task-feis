import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readIndexStyleSource() {
  return readFile(new URL('../src/index.css', import.meta.url), 'utf8')
}

async function testBodyUsesFeishuLikeChineseFontStack() {
  const source = await readIndexStyleSource()

  assert.match(
    source,
    /body \{[\s\S]*font-family:\s*'PingFang SC',\s*'Hiragino Sans GB',\s*'Microsoft YaHei',\s*-apple-system,\s*BlinkMacSystemFont,\s*'Segoe UI',\s*Roboto,\s*'Helvetica Neue',\s*Arial,\s*sans-serif;/,
    '页面全局字体应该优先使用更接近参考图的中文字体栈，避免系统英文字体排在中文字体前面导致观感不一致',
  )
}

async function main() {
  await testBodyUsesFeishuLikeChineseFontStack()
  console.log('global font family regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
