import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const componentFile = 'src/components/Sidebar/index.tsx'
const styleFile = 'src/components/Sidebar/index.less'
const helperFile = 'src/components/Sidebar/tasklistDrag.ts'
const helperOutDir = 'node_modules/.tmp/sidebar-tasklist-drag-check'
const helperTsconfig = `${helperOutDir}/tsconfig.json`

const componentSource = readFileSync(new URL(`../${componentFile}`, import.meta.url), 'utf8')
const styleSource = readFileSync(new URL(`../${styleFile}`, import.meta.url), 'utf8')
mkdirSync(new URL(`../${helperOutDir}`, import.meta.url), { recursive: true })
writeFileSync(
  new URL(`../${helperTsconfig}`, import.meta.url),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2023',
        module: 'ES2022',
        moduleResolution: 'bundler',
        rootDir: '../../../src',
        outDir: '.',
        skipLibCheck: true,
        verbatimModuleSyntax: true,
      },
      include: ['../../../src/components/Sidebar/tasklistDrag.ts'],
    },
    null,
    2,
  ),
)
execFileSync(
  'node_modules/.bin/tsc',
  [
    '-p',
    helperTsconfig,
  ],
  { cwd: new URL('..', import.meta.url), stdio: 'pipe' },
)
const helperModule = await import(new URL(`../${helperOutDir}/components/Sidebar/tasklistDrag.js`, import.meta.url))

const failures = []

if (!componentSource.includes('dropIndicatorRender={(props) =>')) {
  failures.push(`${componentFile}: 需要自定义 dropIndicatorRender，复刻目标图里的整行水平蓝线。`)
}

if (!componentSource.includes("className=\"sidebar-drop-indicator\"")) {
  failures.push(`${componentFile}: 目标位置提示应使用 sidebar-drop-indicator，避免 Ant 默认左侧圆点样式。`)
}

if (!componentSource.includes('left: 0')) {
  failures.push(`${componentFile}: 蓝线左侧应与清单对象主体对齐，不要额外向左超出。`)
}

if (!componentSource.includes('right: 0')) {
  failures.push(`${componentFile}: 蓝线右侧应与清单对象主体对齐，不要比清单对象更长。`)
}

if (!componentSource.includes('props.dropPosition === 0')) {
  failures.push(`${componentFile}: 拖入分组时不应显示位置蓝线，只保留分组灰色吸附反馈。`)
}

if (componentSource.includes('onDragOver={(info) =>')) {
  failures.push(`${componentFile}: 不应再用 offsetY 自己计算 dropPosition，否则和 Ant Tree 默认落点不同步。`)
}

if (componentSource.includes('dropIndicatorState')) {
  failures.push(`${componentFile}: 不应保留额外 dropIndicatorState，拖拽反馈应尽量复用 Tree 内部 drag-over/drop-target 类。`)
}

if (styleSource.includes('.ant-tree-treenode.dragging > .ant-tree-node-content-wrapper {\n    background: #eff0f1 !important;')) {
  failures.push(`${styleFile}: 拖拽源节点不应继续使用灰色背景。`)
}

const forbiddenStyleSnippets = [
  'linear-gradient(135deg',
  '.drag-drop-indicator',
  '.ant-tree .ant-tree-drop-indicator {\n    background-color: transparent;',
  '.ant-tree .ant-tree-treenode.drop-target-inner',
  '&:after',
  'border-radius: 1px;',
  'border: `1px solid ${token.colorPrimary}`',
]

for (const snippet of forbiddenStyleSnippets) {
  if (styleSource.includes(snippet)) {
    failures.push(`${styleFile}: 仍存在偏离默认飞书效果的自定义拖拽样式：${snippet}`)
  }
}

const requiredStyleSnippets = [
  '.ant-tree-treenode.dragging > .ant-tree-node-content-wrapper',
  'background: #eaf2ff !important;',
  'box-shadow: inset 0 0 0 1px rgba(51, 112, 255, 0.14);',
  '.ant-tree-treenode.dragging:after',
  'display: none;',
  '.ant-tree-treenode.drag-over > .ant-tree-node-content-wrapper',
  '.sidebar-drop-indicator',
  'height: 2px;',
  'background: #3370ff;',
  'overflow: visible;',
]

for (const snippet of requiredStyleSnippets) {
  if (!styleSource.includes(snippet)) {
    failures.push(`${styleFile}: 缺少默认拖拽反馈样式：${snippet}`)
  }
}

const {
  applyTasklistDrop,
} = helperModule

const defaultGroupId = 'default-group'
const testGroupId = 'test-group'
const archiveGroupId = 'archive-group'

function createProjectForDragTest(projectId, groupId, name) {
  return {
    project_id: projectId,
    team_id: 'team-1',
    name,
    description: null,
    status: 'active',
    group_id: groupId,
    user_group_id: groupId,
    user_group_name: null,
    creator_id: 'user-1',
    created_at: '2026-04-25T00:00:00Z',
    updated_at: '2026-04-25T00:00:00Z',
    is_deleted: false,
    task_count: 0,
    done_count: 0,
  }
}

const projects = [
  createProjectForDragTest('a', defaultGroupId, '任务清单 A'),
  createProjectForDragTest('b', testGroupId, '任务清单 B'),
  createProjectForDragTest('c', testGroupId, '任务清单 C'),
  createProjectForDragTest('d', archiveGroupId, '任务清单 D'),
  createProjectForDragTest('e', archiveGroupId, '任务清单 E'),
]

try {
  const appendResult = applyTasklistDrop({
    projects,
    projectId: 'a',
    dropKey: 'grp:test-group',
    dropPosition: 0,
    defaultGroupId,
  })

  assert.equal(appendResult.targetGroupId, testGroupId)
  assert.equal(appendResult.changedGroup, true)
  assert.deepEqual(
    appendResult.projects
      .filter((project) => project.user_group_id === testGroupId)
      .map((project) => project.project_id),
    ['b', 'c', 'a'],
  )

  const exactPositionResult = applyTasklistDrop({
    projects: appendResult.projects,
    projectId: 'a',
    dropKey: 'tl:b',
    dropPosition: -1,
    defaultGroupId,
  })

  assert.equal(exactPositionResult.targetGroupId, testGroupId)
  assert.equal(exactPositionResult.changedGroup, false)
  assert.deepEqual(
    exactPositionResult.projects
      .filter((project) => project.user_group_id === testGroupId)
      .map((project) => project.project_id),
    ['a', 'b', 'c'],
  )

  const crossGroupPositionResult = applyTasklistDrop({
    projects,
    projectId: 'e',
    dropKey: 'tl:c',
    dropPosition: -1,
    defaultGroupId,
  })

  assert.equal(crossGroupPositionResult.targetGroupId, testGroupId)
  assert.equal(crossGroupPositionResult.changedGroup, true)
  assert.deepEqual(
    crossGroupPositionResult.projects
      .filter((project) => project.user_group_id === testGroupId)
      .map((project) => project.project_id),
    ['b', 'e', 'c'],
  )
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  failures.push(`${helperFile}: 清单拖拽落点计算不符合预期：${message}`)
}

if (failures.length > 0) {
  console.error('发现侧栏清单拖拽 UI/落点还没复刻到目标效果：')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('侧栏清单拖拽 UI 和落点规则已符合目标效果。')
