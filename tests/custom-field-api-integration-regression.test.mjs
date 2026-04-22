import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readCustomFieldServiceSource() {
  return readFile(new URL('../src/services/customFieldService.ts', import.meta.url), 'utf8')
}

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskServiceSource() {
  return readFile(new URL('../src/services/taskService.ts', import.meta.url), 'utf8')
}

async function readTaskTypesSource() {
  return readFile(new URL('../src/types/task.ts', import.meta.url), 'utf8')
}

async function testCustomFieldServiceCoversTaskCenterFiveApis() {
  const source = await readCustomFieldServiceSource()

  assert.match(
    source,
    /export interface ApiCustomField \{[\s\S]*is_visible: boolean[\s\S]*sort_order: number/,
    '自定义字段接口模型应该接住 is_visible 和 sort_order，字段配置才能和后端状态一致',
  )
  assert.match(
    source,
    /includeDisabledOptions[\s\S]*include_disabled_options/,
    '查询自定义字段时应该支持 include_disabled_options 参数，对齐 OpenAPI',
  )
  assert.match(
    source,
    /`api\/v1\/task-center\/projects\/\$\{projectId\}\/custom-fields\?\$\{qs\.toString\(\)\}`/,
    'listCustomFields 应该请求 GET /projects/{project_id}/custom-fields 并携带查询参数',
  )
  assert.match(
    source,
    /`api\/v1\/task-center\/projects\/\$\{projectId\}\/custom-fields`[\s\S]*method: 'POST'[\s\S]*field_type/,
    'createCustomField 应该接入 POST /projects/{project_id}/custom-fields',
  )
  assert.match(
    source,
    /export async function updateCustomField\([\s\S]*is_visible\?: boolean[\s\S]*sort_order\?: number[\s\S]*`api\/v1\/task-center\/custom-fields\/\$\{fieldId\}`[\s\S]*method: 'PUT'/,
    'updateCustomField 应该接入 PUT /custom-fields/{field_id}，并支持显示状态和排序',
  )
  assert.match(
    source,
    /`api\/v1\/task-center\/custom-fields\/\$\{fieldId\}\?user_id=\$\{uid\(\)\}`[\s\S]*method: 'DELETE'/,
    'deleteCustomField 应该接入 DELETE /custom-fields/{field_id}',
  )
  assert.match(
    source,
    /`api\/v1\/task-center\/tasks\/\$\{taskId\}\/custom-fields`[\s\S]*method: 'PATCH'[\s\S]*custom_fields/,
    'patchTaskCustomFields 应该接入 PATCH /tasks/{task_id}/custom-fields',
  )
}

async function testFieldConfigPanelPersistsCustomFieldManagement() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const handleToggleCustomFieldVisibility = async \(field: ApiCustomField\) => \{/,
    '字段配置眼睛按钮切换自定义字段时应该持久化 is_visible',
  )
  assert.match(
    source,
    /await updateCustomField\(field\.field_id, \{ is_visible: !field\.is_visible \}\)/,
    '自定义字段显示隐藏应该调用 updateCustomField 写回后端',
  )
  assert.match(
    source,
    /const handleCustomFieldSort = async \(dragFieldId: string, dropFieldId: string\) => \{/,
    '字段配置拖拽自定义字段时应该通过 sort_order 持久化排序',
  )
  assert.match(
    source,
    /await Promise\.all\([\s\S]*updateCustomField\(field\.field_id, \{ sort_order: index \+ 1 \}\)/,
    '自定义字段排序应该调用 updateCustomField 写回 sort_order',
  )
  assert.match(
    source,
    /onDeleted=\{\(fieldId\) => void handleCustomFieldDeleted\(fieldId\)\}/,
    '字段删除后应该从表格可见列和字段列表同步移除',
  )
}

async function testSystemStatusFieldUsesTaskStatusApi() {
  const taskTableSource = await readTaskTableSource()
  const taskServiceSource = await readTaskServiceSource()
  const taskTypesSource = await readTaskTypesSource()

  assert.match(
    taskTypesSource,
    /export type TaskStatus = 'todo' \| 'in_progress' \| 'done' \| 'cancelled'/,
    '任务状态类型应该保留 in_progress 和 cancelled，不能再把所有未完成状态压扁成 todo',
  )
  assert.match(
    taskServiceSource,
    /function normalizeTaskStatus\(status: string, isCompleted: boolean\): Task\['status'\]/,
    'taskService 应该统一收敛接口返回的任务状态值，并兼容新的 is_completed 完成态字段',
  )
  assert.match(
    taskServiceSource,
    /status: normalizeTaskStatus\(api\.status,\s*api\.is_completed\)/,
    'apiTaskToTask 应该优先结合 is_completed 和 status 还原真实任务状态',
  )
  assert.match(
    taskTableSource,
    /if \(field\.guid === 'status'\) \{/,
    '字段配置里显示的系统状态字段应该走单独状态更新逻辑',
  )
  assert.match(
    taskTableSource,
    /await patchTaskStatus\(task\.guid, nextStatus\)/,
    '系统状态字段变更时应该调用 patchTaskStatus，而不是写进 custom_fields.status',
  )
  assert.match(
    taskTableSource,
    /value=\{field\.guid === 'status' \? task\.status : singleValue\}/,
    '状态字段下拉框应该展示任务真实状态，而不是 custom_fields 里的镜像值',
  )
}

async function main() {
  await testCustomFieldServiceCoversTaskCenterFiveApis()
  await testFieldConfigPanelPersistsCustomFieldManagement()
  await testSystemStatusFieldUsesTaskStatusApi()
  console.log('custom field api integration regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
