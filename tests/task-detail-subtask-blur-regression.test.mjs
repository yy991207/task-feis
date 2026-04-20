import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readDetailPanelSource() {
  return readFile(
    new URL('../src/components/TaskDetailPanel/index.tsx', import.meta.url),
    'utf8',
  )
}

async function testSubtaskCreateListensForOutsidePointerDown() {
  const source = await readDetailPanelSource()

  assert.match(
    source,
    /subtaskCreateRowRef/,
    '任务详情子任务新建行应该记录当前行节点，便于判断是不是点到了行外',
  )
  assert.match(
    source,
    /document\.addEventListener\('pointerdown'/,
    '任务详情子任务新建行应该监听全局 pointerdown，保证点空白处也会触发保存',
  )
  assert.match(
    source,
    /\.ant-popover/,
    '点到日期和负责人弹层时不应该误保存，需要排除 popover 浮层区域',
  )
  assert.match(
    source,
    /\.ant-select-dropdown/,
    '点到负责人下拉时不应该误保存，需要排除 select 浮层区域',
  )
}

async function testSubtaskCreateHasSyncSubmitGuard() {
  const source = await readDetailPanelSource()

  assert.match(
    source,
    /subtaskSubmittingRef/,
    '任务详情子任务创建需要同步提交锁，避免点击空白和输入框 blur 重复提交',
  )
}

async function testSubtaskBlurSubmitsNonEmptyTitle() {
  const source = await readDetailPanelSource()

  assert.match(
    source,
    /handleSubtaskCreateBlur/,
    '任务详情子任务输入框 blur 应该统一走提交判断',
  )
  assert.match(
    source,
    /void handleAddSubtask\(\)/,
    '任务详情子任务输入框有标题时，blur 应该触发创建子任务',
  )
}

async function main() {
  await testSubtaskCreateListensForOutsidePointerDown()
  await testSubtaskCreateHasSyncSubmitGuard()
  await testSubtaskBlurSubmitsNonEmptyTitle()
  console.log('task detail subtask blur regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
