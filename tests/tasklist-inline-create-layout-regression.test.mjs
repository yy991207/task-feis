import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyleSource() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testInlineCreateRowSpansWholeTable() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const taskColumnsWithInlineCreateSpan[\s\S]*record\.rowKind !== 'inlineCreate'[\s\S]*colSpan: index === 0 \? taskColumns\.length : 0/,
    '行内新建任务行应该占满整张表，不能把整行内容挤在任务标题单元格里',
  )
}

async function testInlineCreateRowKeepsHorizontalCells() {
  const style = await readTaskTableStyleSource()

  assert.match(
    style,
    /\.inline-create-row \{[\s\S]*display: flex;[\s\S]*align-items: center;/,
    '行内新建任务内部单元格应该横向排列，避免字段竖向堆叠',
  )
  assert.match(
    style,
    /\.inline-create-row \{[\s\S]*\.cell-title \{[\s\S]*flex: 1;[\s\S]*min-width: 240px;/,
    '行内新建任务标题输入框应该占主要宽度，和任务列表列布局保持一致',
  )
}

async function main() {
  await testInlineCreateRowSpansWholeTable()
  await testInlineCreateRowKeepsHorizontalCells()
  console.log('tasklist inline create layout regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
