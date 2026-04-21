import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskDetailLoadsParentChain() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /import Breadcrumb from 'antd\/es\/breadcrumb'/,
    '任务详情父任务链路应该使用 antd Breadcrumb 展示',
  )

  assert.match(
    source,
    /const \[parentTaskChain, setParentTaskChain\] = useState<Task\[\]>\(\[\]\)/,
    '任务详情应该维护当前子任务的父任务链路',
  )

  assert.match(
    source,
    /if \(!task\.parent_task_guid\) \{[\s\S]*setParentTaskChain\(\[\]\)[\s\S]*return undefined[\s\S]*\}/,
    '顶级任务没有父任务链路时，应该清空并且不展示导航',
  )

  assert.match(
    source,
    /while \(parentTaskGuid && depth < PARENT_TASK_CHAIN_MAX_DEPTH\) \{/,
    '加载父任务链路时应该按层级向上递归，并限制最大深度避免异常循环',
  )

  assert.match(
    source,
    /const apiTask = await getTask\(parentTaskGuid\)[\s\S]*const parentTask = apiTaskToTask\(apiTask\)[\s\S]*ancestors\.unshift\(parentTask\)/,
    '父任务链路应该从接口加载父任务，并按顶级父任务到直接父任务的顺序展示',
  )
}

async function testSubtaskDetailRendersClickableParentChain() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const handleOpenParentTask = \(parentTask: Task\) => \{/,
    '父任务链路点击应该统一走独立函数，避免导航点击逻辑散落在 JSX 里',
  )

  assert.match(
    source,
    /onOpenTask\?\.\(parentTask\)/,
    '点击父任务链路时应该复用当前详情面板的打开任务逻辑',
  )

  assert.match(
    source,
    /\{isSubtask && parentTaskChain\.length > 0 && \([\s\S]*<Breadcrumb[\s\S]*className="detail-parent-chain"/,
    '只有子任务并且成功加载父链后，才应该展示父任务导航',
  )

  assert.match(
    source,
    /className="detail-parent-chain-link"[\s\S]*onClick=\{\(\) => handleOpenParentTask\(parentTask\)\}/,
    '父任务链路里的每个父任务都应该可以点击跳转详情页',
  )
}

async function testParentChainHasDedicatedStyle() {
  const source = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /\.detail-parent-chain/,
    '父任务链路应该有独立样式，避免挤压标题和字段区',
  )

  assert.match(
    source,
    /\.detail-parent-chain-link/,
    '父任务链路里的可点击父任务应该有独立样式',
  )
}

async function main() {
  await testSubtaskDetailLoadsParentChain()
  await testSubtaskDetailRendersClickableParentChain()
  await testParentChainHasDedicatedStyle()
  console.log('task detail parent chain regressions ok')
}

await main()
