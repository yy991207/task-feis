import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyleSource() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testTaskRowComputesWholeRowIndentFromDepth() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /<div className="task-row-main">[\s\S]*\{depth > 0 && \([\s\S]*className="task-tree-guide"[\s\S]*style=\{\{ width: depth \* 20 \}\}/,
    '任务行应该把树形缩进放到勾选框前面，子任务不能只在标题前面塞空白占位',
  )
}

async function testTaskRowWrapsCheckboxAndTitleIntoIndentedMainArea() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /<div className="task-row-main">[\s\S]*<div className="cell cell-checkbox"/,
    '任务行应该把勾选框放进主信息区，子任务缩进时勾选框要跟着一起往里走',
  )
  assert.match(
    source,
    /<div className="task-row-main">[\s\S]*<div className="cell cell-title">/,
    '任务行应该把标题也放进同一个主信息区，保证父子任务层级是整块缩进而不是只缩标题',
  )
}

async function testTaskRowMainAreaAppliesIndentVariable() {
  const source = await readTaskTableStyleSource()

  assert.match(
    source,
    /\.task-row-main \{[\s\S]*display: flex;[\s\S]*flex: 1;[\s\S]*min-width: 352px;/,
    '任务行样式应该给主信息区单独布局，保证树形缩进只影响勾选框和标题这一块',
  )
  assert.match(
    source,
    /\.cell-more \{[\s\S]*width: 64px;/,
    '任务行尾部操作区应该继续保持独立列，避免跟父子层级缩进混在一起',
  )
}

async function main() {
  await testTaskRowComputesWholeRowIndentFromDepth()
  await testTaskRowWrapsCheckboxAndTitleIntoIndentedMainArea()
  await testTaskRowMainAreaAppliesIndentVariable()
  console.log('subtask indent layout regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
