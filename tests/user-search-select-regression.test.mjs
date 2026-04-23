import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testPickerUsesSearchOnlyInput() {
  const source = await readSource('../src/components/UserSearchSelect/index.tsx')

  assert.match(
    source,
    /const \[searchText, setSearchText\] = useState\(''\)/,
    '选人组件输入框应该只维护搜索文案，不应该继续把已选人员渲染成标签',
  )
  assert.match(
    source,
    /<Input[\s\S]*value=\{searchText\}[\s\S]*onChange=\{\(event\) => setSearchText\(event\.target\.value\)\}/,
    '选人组件应该使用独立搜索输入框，输入只影响列表过滤',
  )
  assert.doesNotMatch(
    source,
    /<Select[\s\S]*mode=\{mode\}[\s\S]*value=\{value\}/,
    '选人组件不应该再用 antd Select 多选标签承载已选人员',
  )
}

async function testPickerTogglesUsersFromList() {
  const source = await readSource('../src/components/UserSearchSelect/index.tsx')

  assert.match(
    source,
    /const handleUserToggle = \(userId: string\): void => \{/,
    '选人组件应该提供列表点击切换函数，统一处理添加和取消',
  )
  assert.match(
    source,
    /selectedIds\.includes\(userId\)\s*\?\s*selectedIds\.filter\(\(id\) => id !== userId\)\s*:\s*\[\.\.\.selectedIds, userId\]/,
    '多人选择时首次点击要添加，二次点击要取消',
  )
  assert.match(
    source,
    /onChange\(nextSelectedIds\)/,
    '多人选择变更后应该直接回传新的负责人数组',
  )
}

async function testPickerShowsAvatarAndCheckedStateInList() {
  const source = await readSource('../src/components/UserSearchSelect/index.tsx')
  const style = await readSource('../src/components/UserSearchSelect/index.less')

  assert.match(
    source,
    /<Avatar[\s\S]*src=\{normalizeAvatarSrc\(user\.avatar\)\}/,
    '人员列表应该展示头像地址，有头像时不能只显示文字',
  )
  assert.match(
    source,
    /<CheckOutlined className="user-search-option-check" \/>/,
    '人员列表应该在已选人员右侧显示对勾',
  )
  assert.match(
    style,
    /\.user-search-option-selected\s*\{[\s\S]*background:\s*#eaf3ff;/,
    '已选人员行应该用浅蓝背景标识选中态',
  )
}

async function main() {
  await testPickerUsesSearchOnlyInput()
  await testPickerTogglesUsersFromList()
  await testPickerShowsAvatarAndCheckedStateInList()
  console.log('user search select regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
