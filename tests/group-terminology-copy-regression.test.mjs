import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSources() {
  const [sidebar, taskTable, taskDetail] = await Promise.all([
    readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/TaskDetailPanel/index.tsx', import.meta.url), 'utf8'),
  ])

  return { sidebar, taskTable, taskDetail }
}

async function testGroupTerminology() {
  const { sidebar, taskTable, taskDetail } = await readSources()

  assert.match(sidebar, /重命名清单分组/, '左侧边栏分组操作应明确为“清单分组”')
  assert.match(sidebar, /删除清单分组/, '左侧边栏删除操作应明确为“清单分组”')
  assert.match(sidebar, /输入清单分组名称/, '左侧边栏输入占位应明确为“清单分组名称”')

  assert.match(taskTable, /任务分组/, '主页面清单内 section 文案应明确为“任务分组”')
  assert.match(taskTable, /删除任务分组/, '主页面 section 删除文案应明确为“任务分组”')

  assert.match(taskDetail, /选择任务分组/, '任务详情里的 section 选择入口应明确为“任务分组”')
}

async function main() {
  await testGroupTerminology()
  console.log('group terminology copy regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
