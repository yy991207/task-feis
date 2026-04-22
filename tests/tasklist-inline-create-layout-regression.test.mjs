import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyleSource() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testInlineCreateUsesRealTableColumns() {
  const source = await readTaskTableSource()

  assert.doesNotMatch(
    source,
    /colSpan: index === 0 \? taskColumns\.length : 0/,
    '行内新建任务不应该再把整行合并成一个大单元格，否则永远做不到和表头逐列对齐',
  )
  assert.match(
    source,
    /record\.rowKind === 'inlineCreate'[\s\S]*renderInlineCreateTitleCell\(record\.section\.guid\)/,
    '行内新建任务标题列应该走独立的标题单元格渲染，直接占用真实表格列宽',
  )
  assert.match(
    source,
    /record\.rowKind === 'inlineCreate'[\s\S]*renderInlineCreatePriorityCell\(record\.section\.guid\)/,
    '行内新建任务优先级列也应该走真实表格列渲染，避免和表头错位',
  )
}

async function testInlineCreateRowKeepsAlignedCells() {
  const style = await readTaskTableStyleSource()

  assert.match(
    style,
    /\.inline-create-table-row > td \{/,
    '行内新建任务应该直接使用表格自己的 td 容器，和表头列宽保持一一对应',
  )
  assert.match(
    style,
    /\.inline-create-title-cell \{[\s\S]*\.inline-title-input \{[\s\S]*width: 100%;/,
    '行内新建任务标题输入框应该占满标题列，而不是再缩在一小段区域里',
  )
  assert.match(
    style,
    /\.inline-create-field-cell \{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*width: 100%;/,
    '行内新建任务的普通字段单元格应该铺满各自列宽，避免只跟着内容宽度走',
  )
}

async function main() {
  await testInlineCreateUsesRealTableColumns()
  await testInlineCreateRowKeepsAlignedCells()
  console.log('tasklist inline create layout regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
