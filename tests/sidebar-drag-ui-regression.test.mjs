import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarSource() {
  return readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8')
}

async function readSidebarStyleSource() {
  return readFile(new URL('../src/components/Sidebar/index.less', import.meta.url), 'utf8')
}

async function testSidebarDragUiShowsDropIndicatorAndState() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /import \{[\s\S]*DragOutlined[\s\S]*\} from '@ant-design\/icons'/,
    '侧边栏拖拽视觉态应该复用 antd 的拖拽图标，不要再用生硬的文字提示',
  )
  assert.match(
    source,
    /const \[draggingTasklistKey, setDraggingTasklistKey\] = useState<string \| null>\(null\)/,
    '侧边栏应该维护当前被拖拽的清单 key，用来渲染拖拽中的视觉态',
  )
  assert.match(
    source,
    /const \[dropIndicatorState, setDropIndicatorState\] = useState<\{[\s\S]*dropPosition: -1 \| 0 \| 1 \| null[\s\S]*\}\s*\|\s*null>\(null\)/,
    '侧边栏应该维护拖拽落点状态，用来高亮目标位置',
  )
  assert.match(
    source,
    /dropIndicatorRender=\{\(props\) => \{[\s\S]*if \(!dropIndicatorState\) \{/,
    'Tree 应该使用自定义 dropIndicatorRender，把拖拽目标位置画得更清楚',
  )
  assert.match(
    source,
    /onDragStart=\{\(info\) => \{[\s\S]*setDraggingTasklistKey\(/,
    '开始拖拽清单时应该记录当前拖拽中的 key',
  )
  assert.match(
    source,
    /onDragEnd=\{\(\) => \{[\s\S]*setDraggingTasklistKey\(null\)[\s\S]*setDropIndicatorState\(null\)/,
    '拖拽结束后应该清理拖拽中和落点状态',
  )
  assert.match(
    source,
    /onDragOver=\{\(info\) => \{[\s\S]*setDropIndicatorState\(/,
    '拖拽经过目标节点时应该实时刷新落点状态',
  )
}

async function testSidebarDragUiStylesExist() {
  const source = await readSidebarStyleSource()

  assert.match(
    source,
    /\.tasklist-tree-wrap \{[\s\S]*\.ant-tree-treenode\.dragging \{/,
    '拖拽中的清单节点应该有更明显的透明度反馈',
  )
  assert.match(
    source,
    /\.tasklist-tree-wrap \{[\s\S]*\.ant-tree \.ant-tree-treenode\.drop-target \{/,
    '拖拽目标节点应该有独立的高亮样式',
  )
  assert.match(
    source,
    /\.tasklist-tree-wrap \{[\s\S]*\.ant-tree \.ant-tree-treenode\.drop-target::after \{/,
    '拖拽目标节点应该额外画出落点边框或底线，帮助判断会落到哪',
  )
  assert.match(
    source,
    /\.tasklist-tree-wrap \{[\s\S]*\.drag-drop-indicator \{/,
    '拖拽目标位置应该使用更醒目的自定义指示线',
  )
}

async function main() {
  await testSidebarDragUiShowsDropIndicatorAndState()
  await testSidebarDragUiStylesExist()
  console.log('sidebar drag ui regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
