import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskListLoadsSectionsFromApiForTasklistView() {
  const source = await readSource('../src/pages/TaskList.tsx')

  assert.match(
    source,
    /const apiSections = await listSections\(activeNav\.guid\)/,
    '主页面切到任务清单视图时，任务分组应该继续从 sections 接口加载',
  )
}

async function testTaskDetailUsesSameSectionApiSource() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /void listSections\(currentTasklist\.guid\)/,
    '任务详情里的任务分组弹层也应该从 sections 接口拉当前清单分组',
  )

  assert.match(
    source,
    /const tasklistSectionSource = detailTasklistSections/,
    '任务详情里已添加分组和候选分组都应该统一使用接口返回的分组源',
  )

  assert.doesNotMatch(
    source,
    /const filteredTasklistSections = \(currentTasklist\?\.sections \?\? \[\]\)\.filter\(/,
    '任务详情不应该再直接拿清单缓存 sections 过滤候选分组',
  )
}

async function main() {
  await testTaskListLoadsSectionsFromApiForTasklistView()
  await testTaskDetailUsesSameSectionApiSource()
  console.log('task detail section source regressions ok')
}

await main()
