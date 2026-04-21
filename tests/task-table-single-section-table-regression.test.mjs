import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testSectionGroupsRenderInsideOneTable() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /type TaskTableDisplayRow =/,
    '分组视图应该使用统一的表格行类型，避免每个分组单独渲染一个 Table',
  )
  assert.match(
    source,
    /const tableRows = buildTableRows\(\)/,
    'TaskTable 应该先拼出包含分组行和任务行的统一 dataSource',
  )
  assert.doesNotMatch(
    source,
    /groupedTasks\.map\(\(\{ section, tasks: sectionTasks \}\)[\s\S]*renderSectionTable\(/,
    '分组循环里不应该再为每个分组单独渲染 Table',
  )
}

async function testTableUsesUnifiedDataSource() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /<Table<TaskTableDisplayRow>[\s\S]*dataSource=\{tableRows\}/,
    '任务列表区域应该只渲染一个 antd Table，并使用统一 tableRows 数据源',
  )
  assert.match(
    source,
    /section-row-content/,
    '分组标题应该作为表格内的特殊行展示，保持折叠和分组操作入口',
  )
}

async function main() {
  await testSectionGroupsRenderInsideOneTable()
  await testTableUsesUnifiedDataSource()
  console.log('task table single section table regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
