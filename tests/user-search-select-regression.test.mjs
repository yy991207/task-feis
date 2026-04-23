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
    source,
    /USER_AVATAR_FALLBACK_COLOR = '#7b67ee'/,
    '人员列表没有头像地址时，兜底头像颜色应该和页面上的紫色负责人头像一致',
  )
  assert.doesNotMatch(
    source,
    /avatarColors|getAvatarColor/,
    '人员列表不应该再用多色随机兜底头像，避免和页面负责人头像风格不一致',
  )
  assert.match(
    style,
    /\.user-search-option-selected\s*\{[\s\S]*background:\s*#eaf3ff;/,
    '已选人员行应该用浅蓝背景标识选中态',
  )
}

async function testAssigneePickerRemovesPopupTitleCopy() {
  const taskTableSource = await readSource('../src/components/TaskTable/index.tsx')
  const taskDetailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.doesNotMatch(
    taskTableSource,
    /<UserSearchSelect[\s\S]*label="添加负责人"[\s\S]*placeholder="搜索用户"/,
    '主表负责人配置弹层不应该再显示“添加负责人”标题文案',
  )
  assert.doesNotMatch(
    taskDetailSource,
    /<div className="detail-popover-panel">\s*<Text strong>添加负责人<\/Text>\s*<UserSearchSelect/,
    '任务详情负责人配置弹层不应该再显示“添加负责人”标题文案',
  )
  assert.doesNotMatch(
    taskDetailSource,
    /<UserSearchSelect[\s\S]*label="设置子任务负责人"[\s\S]*placeholder="搜索并选择负责人"/,
    '子任务负责人配置弹层不应该再显示“设置子任务负责人”标题文案',
  )
}

async function main() {
  await testPickerUsesSearchOnlyInput()
  await testPickerTogglesUsersFromList()
  await testPickerShowsAvatarAndCheckedStateInList()
  await testAssigneePickerRemovesPopupTitleCopy()
  console.log('user search select regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
