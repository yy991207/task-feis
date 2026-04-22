import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testExpandedRowKeysUseActualTableRowKeys() {
  const source = await readTaskTableSource()

  assert.doesNotMatch(
    source,
    /expandedRowKeys:\s*Array\.from\(expandedTaskGuids\)/,
    '子任务展开状态不能直接把任务 guid 当成表格 rowKey，否则分组表格里无法展开子任务',
  )
  assert.match(
    source,
    /const collectExpandedRowKeys = \([\s\S]*rows: TaskTableDisplayRow\[\][\s\S]*expandedTaskGuids: Set<string>[\s\S]*\): string\[\] =>/,
    'TaskTable 需要把任务 guid 展开状态映射成当前表格里的实际 rowKey',
  )
  assert.match(
    source,
    /expandedRowKeys:\s*collectExpandedRowKeys\(tableRows, expandedTaskGuids\)/,
    'antd Table 的 expandedRowKeys 应该使用映射后的行 key，不能直接用任务 guid',
  )
}

async function main() {
  await testExpandedRowKeysUseActualTableRowKeys()
  console.log('subtask expand rowkey regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
