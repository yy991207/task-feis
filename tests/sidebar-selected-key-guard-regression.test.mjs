import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSidebarSource() {
  return readFile(new URL('../src/components/Sidebar/index.tsx', import.meta.url), 'utf8')
}

async function testSidebarOnlySelectsExistingTreeKeys() {
  const source = await readSidebarSource()

  assert.match(
    source,
    /const selectableTreeKeySet = useMemo\(\(\) => \{/,
    'Sidebar 应该先把当前树里真实存在的可选节点 key 收集起来，避免 Tree 拿到不存在的 selected key',
  )
  assert.match(
    source,
    /const walk = \(nodes: DataNode\[\]\) => \{/,
    'Sidebar 应该递归遍历当前 treeData，保证分组里的清单 key 也能被收集到',
  )
  assert.match(
    source,
    /if \(node\.selectable !== false\) \{\s*keySet\.add\(String\(node\.key\)\)\s*\}/,
    'Sidebar 只应该把真正可选的树节点加入 selected key 白名单，分组和根节点不要误选中',
  )
  assert.match(
    source,
    /const nextKey = encodeTasklistKey\(activeKey\.guid\)/,
    'Sidebar 应该先把当前 active tasklist 转成树 key，再判断是否真实存在',
  )
  assert.match(
    source,
    /return selectableTreeKeySet\.has\(nextKey\) \? \[nextKey\] : \[\]/,
    '当 activeKey 对应节点还没进入 treeData 时，Sidebar 不应该把不存在的 key 传给 Tree.selectedKeys',
  )
}

async function main() {
  await testSidebarOnlySelectsExistingTreeKeys()
  console.log('sidebar selected key guard regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
