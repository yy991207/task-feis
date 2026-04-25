import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const componentFile = 'src/components/Sidebar/index.tsx'
const styleFile = 'src/components/Sidebar/index.less'
const helperFile = 'src/components/Sidebar/tasklistDrag.ts'

const componentSource = readFileSync(new URL(`../${componentFile}`, import.meta.url), 'utf8')
const styleSource = readFileSync(new URL(`../${styleFile}`, import.meta.url), 'utf8')
const helperModule = await import(new URL(`../${helperFile}`, import.meta.url))

const failures = []

if (componentSource.includes('dropIndicatorRender=')) {
  failures.push(`${componentFile}: 不应自定义 dropIndicatorRender，位置蓝线要走 Ant Tree 默认细线。`)
}

if (componentSource.includes('onDragOver={(info) =>')) {
  failures.push(`${componentFile}: 不应再用 offsetY 自己计算 dropPosition，否则和 Ant Tree 默认落点不同步。`)
}

if (componentSource.includes('dropIndicatorState')) {
  failures.push(`${componentFile}: 不应保留额外 dropIndicatorState，拖拽反馈应尽量复用 Tree 内部 drag-over/drop-target 类。`)
}

const forbiddenStyleSnippets = [
  'linear-gradient(135deg',
  'box-shadow: 0 10px 24px',
  '.drag-drop-indicator',
  '.ant-tree .ant-tree-drop-indicator {\n    background-color: transparent;',
  '.ant-tree .ant-tree-treenode.drop-target-inner',
]

for (const snippet of forbiddenStyleSnippets) {
  if (styleSource.includes(snippet)) {
    failures.push(`${styleFile}: 仍存在偏离默认飞书效果的自定义拖拽样式：${snippet}`)
  }
}

const requiredStyleSnippets = [
  '.ant-tree-treenode.dragging > .ant-tree-node-content-wrapper',
  'background: #eff0f1 !important;',
  '.ant-tree-treenode.drag-over > .ant-tree-node-content-wrapper',
  '.ant-tree-drop-indicator',
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
