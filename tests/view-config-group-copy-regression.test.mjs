import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSources() {
  const [viewConfig, sidebar] = await Promise.all([
    readFile(new URL('../src/config/viewConfig.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8'),
  ])

  return { viewConfig, sidebar }
}

async function testViewConfigGroupCopy() {
  const { viewConfig, sidebar } = await readSources()

  assert.match(
    viewConfig,
    /groupLabel: '任务分组'/,
    '视图配置里的任务列表分组选项文案应统一为“任务分组”',
  )

  assert.doesNotMatch(
    viewConfig,
    /groupLabel: '自定义分组'/,
    '视图配置里不应残留“自定义分组”文案',
  )

  assert.match(
    sidebar,
    /所有清单分组都展开/,
    'Sidebar 注释应与当前“清单分组”术语保持一致',
  )
}

async function main() {
  await testViewConfigGroupCopy()
  console.log('view config group copy regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
