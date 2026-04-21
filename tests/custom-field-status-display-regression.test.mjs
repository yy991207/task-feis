import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testSystemStatusFieldUsesTaskStatusInReadMode() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /function formatCustomFieldValue\(task: Task, field: CustomFieldDef, users: User\[\]\): string \{/,
    '自定义字段展示态应该统一走 formatCustomFieldValue',
  )
  assert.match(
    source,
    /if \(field\.guid === 'status'\) \{[\s\S]*task\.status/,
    '系统状态字段默认展示态应该直接读取任务真实 status，而不是再去 custom_fields.status 里找值',
  )
  assert.match(
    source,
    /cancelled[\s\S]*已取消|已取消[\s\S]*cancelled/,
    '状态字段展示态至少要能覆盖已取消这类被禁用但仍可能出现在任务上的状态',
  )
}

async function main() {
  await testSystemStatusFieldUsesTaskStatusInReadMode()
  console.log('custom field status display regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
