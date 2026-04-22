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

async function testTaskDetailPanelClosesOnOutsidePointerDown() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const detailPanelRef = useRef<HTMLDivElement \| null>\(null\)/,
    '任务详情抽屉应该记录自身根节点，用来判断点击是否发生在抽屉外',
  )
  assert.match(
    source,
    /document\.addEventListener\('pointerdown', handleDocumentPointerDown\)/,
    '任务详情抽屉应该监听全局 pointerdown，支持点击外部空白处关闭',
  )
  assert.match(
    source,
    /detailPanelRef\.current\.contains\(target\)/,
    '点到抽屉内部时不能关闭详情页，避免编辑和滚动被打断',
  )
  assert.match(
    source,
    /isTaskDetailFloatingTarget\(target\)/,
    '点到 Popover、Dropdown、Modal 等 portal 浮层时不能误关抽屉',
  )
  assert.match(
    source,
    /onClose\(\)/,
    '确认点到抽屉外部后，应该复用现有 onClose 关闭详情页',
  )
}

async function main() {
  await testTaskDetailPanelIsNotRemountedOnTaskSwitch()
  await testTaskDetailPanelUsesFixedDrawerShell()
  await testTaskDetailPanelResetsTaskScopedState()
  await testTaskDetailPanelClosesOnOutsidePointerDown()
  console.log('task detail drawer regressions ok')
}

await main()
