import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testTaskDetailTitleHasOwnEditingState() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const \[titleEditing, setTitleEditing\] = useState\(false\)/,
    '任务详情标题应该维护独立编辑态，避免和描述区或别的输入态混在一起',
  )
  assert.match(
    source,
    /const \[titleDraft, setTitleDraft\] = useState\(task\.summary\)/,
    '任务详情标题应该维护独立草稿值，输入过程中不能直接改 props',
  )
  assert.match(
    source,
    /setTitleDraft\(task\.summary\)/,
    '切换任务或外部标题更新后，标题草稿应该同步成最新任务名',
  )
  assert.match(
    source,
    /setTitleEditing\(false\)/,
    '标题保存完成或切换任务后，应该回到只读展示态',
  )
}

async function testTaskDetailTitleUsesReadOnlyViewUntilEditing() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const styleSource = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.match(
    source,
    /titleEditing \? \(/,
    '任务详情标题应该区分只读态和编辑态渲染',
  )
  assert.match(
    source,
    /className="detail-title-editor"/,
    '任务详情标题编辑态应该使用独立输入框样式',
  )
  assert.match(
    source,
    /className="detail-title-button"/,
    '任务详情标题只读态应该是可点击按钮，方便进入编辑',
  )
  assert.match(
    source,
    /setTitleEditing\(true\)/,
    '点击标题后应该进入编辑态',
  )
  assert.match(
    styleSource,
    /\.detail-title-button \{/,
    '任务详情标题只读态应该有独立按钮样式',
  )
  assert.match(
    styleSource,
    /\.detail-title-editor \{/,
    '任务详情标题编辑态应该有独立输入框样式',
  )
}

async function testTaskDetailTitleSubmitUsesExistingPatchFlow() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /const handleTitleSubmit = async \(\) => \{/,
    '任务详情标题应该抽出独立提交函数，避免 JSX 里散落提交逻辑',
  )
  assert.match(
    source,
    /const nextSummary = titleDraft\.trim\(\)/,
    '标题提交前应该去掉首尾空格',
  )
  assert.match(
    source,
    /if \(!nextSummary\) \{[\s\S]*message\.warning\('任务标题不能为空'\)/,
    '标题提交时应该拦截空标题并给出明确提示',
  )
  assert.match(
    source,
    /if \(nextSummary === task\.summary\) \{[\s\S]*setTitleEditing\(false\)/,
    '标题没有变化时应该直接退出编辑态，不重复调接口',
  )
  assert.match(
    source,
    /await handleTaskPatch\(\{\s*summary: nextSummary,\s*\}\)/,
    '标题更新应该继续复用现有 handleTaskPatch，保证列表和详情同步走同一链路',
  )
}

async function main() {
  await testTaskDetailTitleHasOwnEditingState()
  await testTaskDetailTitleUsesReadOnlyViewUntilEditing()
  await testTaskDetailTitleSubmitUsesExistingPatchFlow()
  console.log('task detail title edit regressions ok')
}

await main()
