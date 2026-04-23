import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testSubtaskRowUsesDedicatedMainWrapper() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /<div className="subtask-main">[\s\S]*className="subtask-title-btn"[\s\S]*className="subtask-meta"/,
    '子任务行应该把标题区和右侧操作区包进独立主内容容器，避免直接平铺后互相挤压',
  )
}

async function testSubtaskRowAllowsMetaWrapOnNarrowDrawer() {
  const source = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /\.detail-subtask-row\s*\{[\s\S]*align-items:\s*flex-start;[\s\S]*\}/,
    '子任务行在窄抽屉里应该从顶部对齐，给多行排版留空间',
  )
  assert.match(
    source,
    /\.subtask-main\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*wrap;[\s\S]*min-width:\s*0;[\s\S]*\}/,
    '子任务主内容区应该允许换行，不然长标题会把日期和负责人挤乱',
  )
  assert.match(
    source,
    /\.subtask-meta\s*\{[\s\S]*flex-wrap:\s*wrap;[\s\S]*max-width:\s*100%;[\s\S]*\}/,
    '子任务右侧元信息区应该支持自身换行，并限制最大宽度',
  )
  assert.match(
    source,
    /\.subtask-assignee-trigger\s*\{[\s\S]*min-width:\s*0;[\s\S]*max-width:\s*100%;[\s\S]*\}/,
    '子任务负责人按钮应该允许收缩，不然多个名字会把抽屉撑爆',
  )
}

async function main() {
  await testSubtaskRowUsesDedicatedMainWrapper()
  await testSubtaskRowAllowsMetaWrapOnNarrowDrawer()
  console.log('task detail subtask layout regressions ok')
}

await main()
