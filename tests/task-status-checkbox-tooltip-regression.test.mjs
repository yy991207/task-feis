import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskTableCheckboxUsesStatusTooltip() {
  const source = await readSource('../src/components/TaskTable/index.tsx')

  assert.match(
    source,
    /const statusToggleTooltip = task\.status === 'done' \? '标记未完成' : '标记已完成'/,
    '主视图任务前面的方框应该根据当前状态显示不同的浮窗提示',
  )

  assert.match(
    source,
    /<Tooltip[\s\S]*title=\{statusToggleTooltip\}[\s\S]*placement="top"[\s\S]*color="#000"[\s\S]*overlayInnerStyle=\{\{ color: '#fff' \}\}[\s\S]*<Checkbox[\s\S]*checked=\{task\.status === 'done'\}/,
    '主视图任务方框的浮窗应该使用黑底白字，并包裹当前任务状态勾选框',
  )
}

async function testTaskDetailUsesCheckboxBeforeTitle() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const styleSource = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /const handleToggleTaskStatus = async \(\) => \{/,
    '详情页当前任务应该抽出独立的状态切换函数，避免标题区和别处重复写状态更新逻辑',
  )

  assert.match(
    source,
    /<div className=\{`detail-title-row \$\{task\.status === 'done' \? 'is-done' : ''\}`\}>[\s\S]*<Tooltip[\s\S]*title=\{task\.status === 'done' \? '标记未完成' : '标记已完成'\}[\s\S]*placement="top"[\s\S]*color="#000"[\s\S]*overlayInnerStyle=\{\{ color: '#fff' \}\}[\s\S]*<Checkbox[\s\S]*className="detail-title-checkbox"[\s\S]*checked=\{task\.status === 'done'\}[\s\S]*titleEditing \? \([\s\S]*className="detail-title-editor"[\s\S]*\) : \([\s\S]*className="detail-title-button"[\s\S]*<span className="detail-title">\{task\.summary\}<\/span>/,
    '详情页应该把任务状态方框放到标题前面，并保留标题只读态和编辑态的切换结构',
  )

  assert.doesNotMatch(
    source,
    />\s*完成任务\s*</,
    '详情页顶部不应该再保留“完成任务”文字按钮',
  )

  assert.doesNotMatch(
    source,
    />\s*任务已完成\s*</,
    '详情页顶部不应该再保留“任务已完成”标签文案',
  )

  assert.match(
    styleSource,
    /\.detail-title-row \{[\s\S]*display: flex;[\s\S]*gap: 10px;/,
    '详情页标题区应该改成标题方框同一行布局，保证排版更紧凑',
  )

  assert.match(
    styleSource,
    /\.detail-title-checkbox \{/,
    '详情页标题前的方框需要独立样式，确保和标题对齐',
  )
}

async function testDetailSubtaskCheckboxUsesSameTooltipCopy() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /<Tooltip[\s\S]*title=\{isDone \? '标记未完成' : '标记已完成'\}[\s\S]*placement="top"[\s\S]*color="#000"[\s\S]*overlayInnerStyle=\{\{ color: '#fff' \}\}[\s\S]*className=\{`subtask-check \$\{isDone \? 'checked' : ''\}`\}/,
    '详情页子任务前面的方框也应该沿用同一套状态提示文案和黑底白字浮窗',
  )
}

async function main() {
  await testTaskTableCheckboxUsesStatusTooltip()
  await testTaskDetailUsesCheckboxBeforeTitle()
  await testDetailSubtaskCheckboxUsesSameTooltipCopy()
  console.log('task status checkbox tooltip regressions ok')
}

await main()
