import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarSource() {
  return readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8')
}

async function testSidebarDefaultsAllTasklistGroupsExpanded() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /const buildDefaultExpandedKeys = \(groups: ProjectGroup\[\]\): React\.Key\[\] => \[/,
    'Sidebar 应该集中生成默认展开 key，避免刷新后只展开根任务清单',
  )
  assert.match(
    source,
    /groups[\s\S]*filter\(\(group\) => !group\.is_default\)[\s\S]*encodeGroupKey\(group\.group_id\)/,
    'Sidebar 默认展开 key 应该包含所有非默认分组',
  )
  assert.match(
    source,
    /setExpandedKeys\(\(prev\) => \{[\s\S]*const next = new Set\(prev\)[\s\S]*buildDefaultExpandedKeys\(list\)\.forEach\(\(key\) => next\.add\(key\)\)[\s\S]*return Array\.from\(next\)[\s\S]*\}\)/,
    'Sidebar 首次加载项目分组后应该把默认展开 key 合并进 expandedKeys',
  )
}

async function testSidebarKeepsManualExpandControl() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /const handleExpand: TreeProps\['onExpand'\] = \(keys\) => \{\s*setExpandedKeys\(keys\)\s*\}/,
    'Sidebar 仍然应该允许用户手动展开和收起分组',
  )
}

async function main() {
  await testSidebarDefaultsAllTasklistGroupsExpanded()
  await testSidebarKeepsManualExpandControl()
  console.log('sidebar expanded groups regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
