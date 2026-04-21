import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testTaskTableCreateSectionCopy() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /新建任务分组/,
    '主页面表格底部的新建分组入口文案应该明确为“新建任务分组”',
  )
}

async function main() {
  await testTaskTableCreateSectionCopy()
  console.log('task table create section copy regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
