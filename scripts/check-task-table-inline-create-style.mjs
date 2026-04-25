import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(file) {
  return readFile(new URL(`../${file}`, import.meta.url), 'utf8')
}

async function testNewTaskEntryUsesBlockContainer() {
  const source = await readSource('src/components/TaskTable/index.tsx')
  const buildRowsStart = source.indexOf('const buildTableRows = () => {')
  const buildRowsEnd = source.indexOf('const tableRows = buildTableRows()', buildRowsStart)
  const buildRowsSource =
    buildRowsStart >= 0 && buildRowsEnd >= 0
      ? source.slice(buildRowsStart, buildRowsEnd)
      : source

  assert.match(source, /className="new-task-entry"/)
  assert.match(source, /className="new-task-entry-label"/)
  assert.match(buildRowsSource, /rowKind: 'newTask'/)
  assert.doesNotMatch(buildRowsSource, /config\.toolbar\.showCreate\s*&&\s*isSectionGroupMode/)
}

async function testInlineCreateUsesAntdComposition() {
  const source = await readSource('src/components/TaskTable/index.tsx')

  assert.match(source, /import Flex from 'antd\/es\/flex'/)
  assert.match(source, /<Flex[\s\S]*className="cell cell-title task-edit-cell task-edit-cell-title"/)
  assert.match(source, /<TaskTitleEditBox[\s\S]*prefix=\{\s*<Checkbox disabled/)
  assert.match(source, /className="task-edit-select inline-create-priority-select"/)
  assert.match(source, /triggerClassName="task-edit-trigger assignee-trigger inline-create-assignee-trigger"/)
  assert.match(source, /className="task-edit-trigger task-edit-date-trigger"/)

  assert.doesNotMatch(source, /className="inline-create-title-cell"/)
  assert.doesNotMatch(source, /className="inline-create-title-box"/)
  assert.doesNotMatch(source, /className="task-title-edit-box"/)
  assert.doesNotMatch(source, /className="inline-create-field-shell task-edit-field-trigger"/)
}

async function testExistingTaskEditingUsesSameAntdShell() {
  const source = await readSource('src/components/TaskTable/index.tsx')

  assert.match(source, /className=\{`task-edit-input\$\{active \? ' task-edit-input-active' : ''\}`\}/)
  assert.match(source, /<Button type="text" className="task-edit-trigger" block/)
  assert.match(source, /triggerClassName="task-edit-trigger assignee-trigger inline-create-assignee-trigger"/)
  assert.match(source, /className="task-edit-trigger task-edit-date-trigger date-trigger-readonly"/)
}

async function testStylesTargetAntdControlsDirectly() {
  const style = await readSource('src/components/TaskTable/index.less')

  assert.match(style, /\.new-task-entry \{[\s\S]*min-height: 44px[\s\S]*border-radius: 10px/)
  assert.match(style, /\.inline-create-table-row > td \{[\s\S]*background: #edf4ff !important;/)
  assert.match(style, /\.task-edit-input\.ant-input \{[\s\S]*min-height: 40px/)
  assert.match(style, /\.task-edit-trigger\.ant-btn \{[\s\S]*min-height: 40px/)
  assert.match(style, /\.task-edit-select\.ant-select \{[\s\S]*width: 100%/)
  assert.match(style, /\.inline-create-table-row \{[\s\S]*\.task-edit-cell \{/)

  assert.doesNotMatch(style, /\.inline-create-title-cell \{/)
  assert.doesNotMatch(style, /\.inline-create-title-box \{/)
  assert.doesNotMatch(style, /\.task-title-edit-box \{/)
  assert.doesNotMatch(style, /\.inline-create-field-shell \{/)
}

async function main() {
  await testNewTaskEntryUsesBlockContainer()
  await testInlineCreateUsesAntdComposition()
  await testExistingTaskEditingUsesSameAntdShell()
  await testStylesTargetAntdControlsDirectly()
  console.log('task table inline create style check ok')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
