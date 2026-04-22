import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testRequestThrowsBackendPermissionMessage() {
  const source = await readSource('../src/services/request.ts')

  assert.match(
    source,
    /if \(!json\.success\) \{[\s\S]*throw new Error\(json\.msg \|\| `请求失败 \(\$\{json\.code\}\)`\)/,
    '统一请求层在 success=false 时应该继续抛出后端返回的 msg，给前端反馈真实错误原因',
  )
}

async function testTaskTableUsesBackendMessageForStatusFailure() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /function getActionErrorMessage\(error: unknown, fallback: string\): string \{[\s\S]*error instanceof Error \? error\.message : fallback/,
    '主视图应该提供统一错误消息提取函数，优先展示后端返回的 msg',
  )

  assert.match(
    source,
    /} catch \(err\) \{[\s\S]*handleTaskUpdate\(task\)[\s\S]*message\.error\(getActionErrorMessage\(err, '更新状态失败'\)\)/,
    '主视图切换任务状态失败时，应该优先展示后端返回的权限提示',
  )

  assert.match(
    source,
    /} catch \(err\) \{[\s\S]*handleTaskUpdate\(task\)[\s\S]*message\.error\(getActionErrorMessage\(err, '更新状态失败'\)\)/,
    '主视图字段区切换状态失败时，也应该优先展示后端返回的权限提示',
  )
}

async function testTaskDetailUsesBackendMessageForPermissionDenied() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /function getActionErrorMessage\(error: unknown, fallback: string\): string \{[\s\S]*error instanceof Error \? error\.message : fallback/,
    '详情页也应该提供统一错误消息提取函数，优先展示后端返回的 msg',
  )

  assert.match(
    source,
    /} catch \(err\) \{[\s\S]*message\.error\(getActionErrorMessage\(err, '更新负责人失败'\)\)/,
    '详情页更新负责人失败时，应该优先展示后端返回的权限提示',
  )

  assert.match(
    source,
    /const handleToggleTaskStatus = async \(\) => \{[\s\S]*} catch \(err\) \{[\s\S]*message\.error\(getActionErrorMessage\(err, '状态更新失败'\)\)/,
    '详情页切换当前任务状态失败时，应该优先展示后端返回的权限提示',
  )

  assert.match(
    source,
    /const handleToggleSubtaskStatus = async \(subtask: Task\) => \{[\s\S]*} catch \(err\) \{[\s\S]*message\.error\(getActionErrorMessage\(err, '状态更新失败'\)\)/,
    '详情页切换子任务状态失败时，应该优先展示后端返回的权限提示',
  )
}

async function main() {
  await testRequestThrowsBackendPermissionMessage()
  await testTaskTableUsesBackendMessageForStatusFailure()
  await testTaskDetailUsesBackendMessageForPermissionDenied()
  console.log('permission denied feedback regressions ok')
}

await main()
