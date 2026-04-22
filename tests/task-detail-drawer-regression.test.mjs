import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskDetailPanelIsNotRemountedOnTaskSwitch() {
  const source = await readSource('../src/pages/TaskList.tsx')

  assert.doesNotMatch(
    source,
    /key=\{selectedTask\.guid\}/,
    '切换任务详情时，抽屉不能靠重挂载刷新，不然位置和内部状态都会抖动',
  )
}

async function testTaskDetailPanelUsesFixedDrawerShell() {
  const source = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /\.detail-panel\s*\{[\s\S]*position:\s*fixed;/,
    '任务详情容器应该固定在右侧，作为真正的抽屉显示',
  )
  assert.match(
    source,
    /\.detail-panel\s*\{[\s\S]*right:\s*0;/,
    '任务详情抽屉应该贴右侧固定，不要跟着主内容区重新排版',
  )
  assert.match(
    source,
    /\.detail-panel\s*\{[\s\S]*box-shadow:/,
    '任务详情抽屉应该有独立的阴影层次，贴近抽屉视觉',
  )
}

async function testTaskDetailPanelResetsTaskScopedState() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /useLayoutEffect\(\(\) => \{[\s\S]*setCommentValue\(''\)[\s\S]*setComments\(\[\]\)[\s\S]*detailScrollRef\.current\.scrollTo\(\{ top: 0 \}\)/,
    '切换任务后，评论、历史和滚动位置应该跟着当前任务一起重置',
  )
}

async function main() {
  await testTaskDetailPanelIsNotRemountedOnTaskSwitch()
  await testTaskDetailPanelUsesFixedDrawerShell()
  await testTaskDetailPanelResetsTaskScopedState()
  console.log('task detail drawer regressions ok')
}

await main()
