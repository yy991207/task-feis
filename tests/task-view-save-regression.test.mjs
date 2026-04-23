import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readViewServiceSource() {
  return readFile(new URL('../src/services/viewService.ts', import.meta.url), 'utf8')
}

async function readViewTypesSource() {
  return readFile(new URL('../src/types/view.ts', import.meta.url), 'utf8')
}

async function testViewServiceUsesTaskCenterViewApis() {
  const source = await readViewServiceSource()

  assert.match(
    source,
    /export async function listTaskViews\([\s\S]*`api\/v1\/task-center\/projects\/\$\{projectId\}\/views\?\$\{qs\.toString\(\)\}`/,
    '视图列表应该接入 GET /projects/{project_id}/views，并携带 user_id 查询参数',
  )
  assert.match(
    source,
    /export async function createTaskView\([\s\S]*`api\/v1\/task-center\/projects\/\$\{projectId\}\/views`[\s\S]*method: 'POST'[\s\S]*filters/,
    '保存新视图应该接入 POST /projects/{project_id}/views，并把 filters 写入后端',
  )
  assert.match(
    source,
    /export async function updateTaskView\([\s\S]*`api\/v1\/task-center\/views\/\$\{viewId\}`[\s\S]*method: 'PUT'[\s\S]*filters/,
    '已有视图再次保存时应该走 PUT /views/{view_id} 更新 filters，避免一直创建重复视图',
  )
}

async function testViewTypesPersistToolbarFilterState() {
  const source = await readViewTypesSource()

  assert.match(
    source,
    /export interface SavedTaskViewFilters \{[\s\S]*statusFilter\?:[\s\S]*filterConditions\?:[\s\S]*sortMode\?:[\s\S]*groupMode\?:[\s\S]*visibleColumnKeys\?:/,
    '后端 filters 里应该保存状态筛选、条件筛选、排序、分组和字段显示，刷新后才能恢复当前主视图',
  )
  assert.match(
    source,
    /export interface TaskView \{[\s\S]*view_id: string[\s\S]*filters: SavedTaskViewFilters/,
    '视图返回模型应该接住 view_id 和 filters，后续保存可更新同一个视图',
  )
}

async function testTaskTableLoadsAndSavesCurrentView() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /import \{[\s\S]*createTaskView[\s\S]*listTaskViews[\s\S]*updateTaskView[\s\S]*\} from '@\/services\/viewService'/,
    'TaskTable 应该接入视图服务，而不是只做前端本地筛选',
  )
  assert.match(
    source,
    /const handleSaveTaskView = useCallback\(async \(\) => \{/,
    'TaskTable 应该提供保存当前视图的方法',
  )
  assert.match(
    source,
    /filterConditions: serializeTaskViewFilterConditions\(filterConditions\)/,
    '保存视图时应该把当前筛选条件数组序列化进 filters',
  )
  assert.match(
    source,
    /await listTaskViews\(tasklist\.guid\)/,
    '进入清单后应该读取后端已保存视图，支持刷新后恢复',
  )
  assert.match(
    source,
    /applySavedTaskViewFilters\(latestView\.filters/,
    '读取视图后应该把 filters 应用回当前工具栏状态',
  )
  assert.match(
    source,
    />\s*保存视图\s*<\/Button>/,
    '清单主视图工具栏应该新增“保存视图”按钮',
  )
}

async function main() {
  await testViewServiceUsesTaskCenterViewApis()
  await testViewTypesPersistToolbarFilterState()
  await testTaskTableLoadsAndSavesCurrentView()
  console.log('task view save regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
