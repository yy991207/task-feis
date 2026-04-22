import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskListSource() {
  return readFile(new URL('../src/pages/TaskList.tsx', import.meta.url), 'utf8')
}

async function readTaskListStyleSource() {
  return readFile(new URL('../src/pages/TaskList.less', import.meta.url), 'utf8')
}

async function testSidebarSupportsDragResize() {
  const source = await readTaskListSource()

  assert.match(
    source,
    /const \[sidebarWidth, setSidebarWidth\] = useState\(240\)/,
    '任务页应该为左侧边栏维护独立宽度状态，不能继续把侧栏宽度写死成 240',
  )
  assert.match(
    source,
    /const sidebarResizeStateRef = useRef<\{ dragging: boolean; startX: number; startWidth: number \}>/,
    '任务页应该像详情页一样给左侧边栏增加拖拽态 ref',
  )
  assert.match(
    source,
    /document\.body\.classList\.add\('sidebar-resizing'\)/,
    '开始拖动左侧边栏时应该给 body 加统一的 resizing class，避免拖拽时文字误选中',
  )
  assert.match(
    source,
    /document\.body\.classList\.remove\('sidebar-resizing'\)/,
    '左侧边栏拖拽结束后应该清理 resizing class',
  )
  assert.match(
    source,
    /const boundedWidth = Math\.min\(360, Math\.max\(180, nextWidth\)\)/,
    '左侧边栏拖拽宽度应该限制在合理范围内，避免拖得太窄或太宽',
  )
  assert.match(
    source,
    /<Sider[\s\S]*width=\{sidebarWidth\}/,
    '左侧边栏的 Sider 宽度应该绑定到可变的 sidebarWidth',
  )
  assert.match(
    source,
    /<div\s+className="sidebar-resize-handle"/,
    '左侧边栏区域应该渲染独立的拖拽手柄',
  )
}

async function testSidebarResizeStylesExist() {
  const styleSource = await readTaskListStyleSource()

  assert.match(
    styleSource,
    /\.sidebar-resize-handle \{/,
    '任务页样式里应该新增左侧边栏拖拽手柄样式',
  )
  assert.match(
    styleSource,
    /body\.sidebar-resizing \{/,
    '任务页样式里应该新增侧栏拖拽中的 body 光标样式',
  )
  assert.match(
    styleSource,
    /body\.sidebar-resizing\s*\{[\s\S]*?\.app-sider\s*\{[\s\S]*transition:\s*none\s*!important;/,
    '左侧边栏拖拽时应该关闭 Sider 自带的过渡动画，不然宽度会跟手势不同步，手感会比详情页发黏',
  )
}

async function main() {
  await testSidebarSupportsDragResize()
  await testSidebarResizeStylesExist()
  console.log('sidebar resize regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
