import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testInlineCreateListensForOutsidePointerDown() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /inlineCreateRowRef/,
    '任务清单行内新建任务应该记录当前新建行节点，便于判断是不是点到了行外',
  )
  assert.match(
    source,
    /document\.addEventListener\('pointerdown'/,
    '任务清单行内新建任务应该监听全局 pointerdown，保证点空白处也会触发保存判断',
  )
  assert.match(
    source,
    /\.ant-popover/,
    '点到负责人和日期弹层时不应该误保存，需要排除 popover 浮层区域',
  )
  assert.match(
    source,
    /\.ant-select-dropdown/,
    '点到优先级和负责人下拉时不应该误保存，需要排除 select 浮层区域',
  )
}

async function testInlineCreateHasSyncSubmitGuard() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /inlineCreateSubmittingRef/,
    '行内新建任务需要同步提交锁，避免点击空白和输入框 blur 在同一轮里重复提交',
  )
}

async function main() {
  await testInlineCreateListensForOutsidePointerDown()
  await testInlineCreateHasSyncSubmitGuard()
  console.log('tasklist inline create blur regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
