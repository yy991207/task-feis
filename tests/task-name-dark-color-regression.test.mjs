import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function testTaskTableSectionAndTaskNamesUseDeepBlack() {
  const styleSource = await readSource('../src/components/TaskTable/index.less')

  assert.match(
    styleSource,
    /\.section-row-content \{[\s\S]*\.section-name \{[\s\S]*color: #1f2329;/,
    '主任务表格里的任务分组名称应该是深黑色',
  )
  assert.match(
    styleSource,
    /\.task-title-cell \{[\s\S]*\.title-text,[\s\S]*\.done-text \{[\s\S]*color: #1f2329;/,
    '主任务表格里的任务名称应该统一是深黑色',
  )
  assert.match(
    styleSource,
    /\.task-title-cell\.done \{[\s\S]*\.done-text \{[\s\S]*color: #1f2329;/,
    '主任务表格里已完成任务名称也应该保持深黑色，不再切成灰色',
  )
}

async function testTaskDetailNamesUseDeepBlack() {
  const styleSource = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    styleSource,
    /\.detail-title \{[\s\S]*color: #1f2329;/,
    '任务详情页标题应该保持深黑色',
  )
  assert.match(
    styleSource,
    /\.detail-title-row \{[\s\S]*&\.is-done \{[\s\S]*\.detail-title \{[\s\S]*color: #1f2329;/,
    '任务详情页已完成任务标题也应该保持深黑色，不要切成灰色',
  )
  assert.match(
    styleSource,
    /\.tasklist-section-chip-name \{[\s\S]*color: #1f2329;/,
    '任务详情页任务分组标签名称应该是深黑色',
  )
  assert.match(
    styleSource,
    /\.tasklist-section-search-item \{[\s\S]*color: #1f2329;/,
    '任务详情页任务分组搜索列表名称应该是深黑色',
  )
  assert.match(
    styleSource,
    /\.subtask-title \{[\s\S]*color: #1f2329;/,
    '任务详情页子任务名称应该是深黑色',
  )
  assert.match(
    styleSource,
    /&\.is-done \.subtask-title \{[\s\S]*color: #1f2329;/,
    '任务详情页已完成子任务名称也应该保持深黑色',
  )
}

async function testSidebarGroupAndTasklistNamesUseDeepBlack() {
  const styleSource = await readSource('../src/components/Sidebar/index.less')

  assert.match(
    styleSource,
    /\.group-name \{[\s\S]*color: #1f2329;/,
    '左侧边栏里的任务分组名称应该是深黑色',
  )
  assert.match(
    styleSource,
    /\.tasklist-title \{[\s\S]*color: #1f2329;/,
    '左侧边栏里的任务清单名称应该是深黑色',
  )
}

async function main() {
  await testTaskTableSectionAndTaskNamesUseDeepBlack()
  await testTaskDetailNamesUseDeepBlack()
  await testSidebarGroupAndTasklistNamesUseDeepBlack()
  console.log('task name dark color regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
