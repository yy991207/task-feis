import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testTaskTableUsesAntdTableComponent() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /import Table from 'antd\/es\/table'/,
    'TaskTable 需要直接引入 antd Table，避免继续维护手写表格骨架',
  )
  assert.match(
    source,
    /<Table[\s\S]*dataSource=/,
    'TaskTable 渲染任务区域时应该使用 antd Table 的 dataSource',
  )
}

async function main() {
  await testTaskTableUsesAntdTableComponent()
  console.log('task table antd regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
