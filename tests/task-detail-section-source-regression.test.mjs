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

  assert.match(
    source,
    /const \[detailTasklistSectionsLoading, setDetailTasklistSectionsLoading\] = useState\(false\)/,
    '任务详情应该维护分组接口加载态，避免接口返回前先显示未分组或选择分组',
  )

  assert.match(
    source,
    /setDetailTasklistSectionsLoading\(true\)[\s\S]*void listSections\(currentTasklist\.guid\)[\s\S]*finally\(\(\) => \{[\s\S]*setDetailTasklistSectionsLoading\(false\)/,
    '任务详情拉取当前清单分组时，应该在请求前后正确切换加载态',
  )

  assert.match(
    source,
    /detailTasklistSectionsLoading[\s\S]*分组加载中/,
    '任务详情分组展示区在接口未返回前应该显示加载占位，不要闪旧分组空态',
  )

  assert.doesNotMatch(
    source,
    /const filteredTasklistSections = \(currentTasklist\?\.sections \?\? \[\]\)\.filter\(/,
    '任务详情不应该再直接拿清单缓存 sections 过滤候选分组',
  )
}

async function testTaskDetailReloadsSectionsAfterTaskSwitch() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /setDetailTasklistSections\(\[\]\)[\s\S]*setDetailTasklistSectionsLoading\(Boolean\(task\.tasklists\[0\]\?\.tasklist_guid\)\)/,
    '详情抽屉切换任务时会清空当前分组缓存，应该同步进入加载态，避免同清单切任务时短暂显示“选择分组”',
  )

  assert.match(
    source,
    /void listSections\(currentTasklist\.guid\)[\s\S]*\}, \[currentTasklist, task\.guid\]\)/,
    '详情抽屉在同一个任务清单内切换任务时，也应该重新加载分组，否则被清空的分组缓存不会恢复',
  )
}

async function main() {
  await testTaskListLoadsSectionsFromApiForTasklistView()
  await testTaskDetailUsesSameSectionApiSource()
  await testTaskDetailReloadsSectionsAfterTaskSwitch()
  console.log('task detail section source regressions ok')
}

await main()
