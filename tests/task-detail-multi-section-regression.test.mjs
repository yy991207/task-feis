import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

function extractFunctionBlock(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker)
  if (startIndex === -1) {
    return ''
  }
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length)
  if (endIndex === -1) {
    return source.slice(startIndex)
  }
  return source.slice(startIndex, endIndex)
}

async function testTaskServiceSupportsTasklistsPatch() {
  const taskServiceSource = await readSource('../src/services/taskService.ts')

  assert.match(
    taskServiceSource,
    /import type \{ Task, Priority, CustomFieldValue, TasklistRef \} from '\.\/?@?\/types\/task'|import type \{ Task, Priority, CustomFieldValue, TasklistRef \} from '@\/types\/task'/,
    '任务服务更新接口需要显式拿到 TasklistRef 类型，给任务清单和任务分组回写复用',
  )
  assert.match(
    taskServiceSource,
    /tasklists\?: TasklistRef\[\]/,
    '更新任务接口应该支持回写 tasklists，详情页多任务分组才能真正保存',
  )
  assert.match(
    taskServiceSource,
    /body: JSON\.stringify\(\{ user_id: appConfig\.user_id, \.\.\.patch \}\)/,
    '更新任务接口应该把 tasklists 原样透传给后端，不要再只支持单个 section_id',
  )
}

async function testTaskDetailPanelRendersMultiSectionSelector() {
  const detailSource = await readSource('../src/components/TaskDetailPanel/index.tsx')
  const styleSource = await readSource('../src/components/TaskDetailPanel/index.less')

  assert.doesNotMatch(
    detailSource,
    /const \[selectedTasklistGuid\] = useState\(task\.tasklists\[0\]\?\.tasklist_guid\)/,
    '任务详情不应该再把任务清单来源固定成 task.tasklists[0]，否则同一清单下多个任务分组会被截断',
  )
  assert.doesNotMatch(
    detailSource,
    /const \[selectedSectionGuid, setSelectedSectionGuid\] = useState\(\s*task\.tasklists\[0\]\?\.section_guid \?\? '',?\s*\)/,
    '任务详情不应该再只维护一个 selectedSectionGuid，应该能同时管理当前清单下多个任务分组',
  )
  assert.match(
    detailSource,
    /const currentTasklistRefs = task\.tasklists\.filter\(\s*\(item\) => item\.tasklist_guid === currentTasklist\?\.guid,\s*\)/,
    '任务详情应该先筛出当前任务在当前清单下的所有分组引用，再做已添加分组展示',
  )
  assert.match(
    detailSource,
    /const \[sectionSearchValue, setSectionSearchValue\] = useState\(''\)/,
    '任务详情应该给任务分组搜索单独维护输入值',
  )
  assert.match(
    detailSource,
    /import \{ listSections, moveTaskToSection \} from '@\/services\/sectionService'/,
    '任务详情任务分组候选必须和主页面一样从 sections 接口加载，不能只依赖清单缓存',
  )
  assert.match(
    detailSource,
    /const \[detailTasklistSections, setDetailTasklistSections\] = useState<Section\[\]>\(\[\]\)/,
    '任务详情应该单独维护接口返回的当前清单分组数据',
  )
  assert.match(
    detailSource,
    /void listSections\(currentTasklist\.guid\)[\s\S]*const sections: Section\[\] = items[\s\S]*section_id[\s\S]*sort_order[\s\S]*is_default[\s\S]*setDetailTasklistSections\(sections\)/,
    '任务详情切换清单后应该调用 listSections 并把接口字段转成前端 Section',
  )
  assert.match(
    detailSource,
    /const tasklistSectionSource = detailTasklistSections/,
    '任务详情计算已添加和候选分组时，应该统一使用接口返回的分组源',
  )
  assert.match(
    detailSource,
    /const filteredTasklistSections = tasklistSectionSource\.filter\(/,
    '任务详情应该根据输入内容过滤接口返回的当前清单任务分组候选列表',
  )
  assert.match(
    detailSource,
    /const handleAddTaskToSection = async \(sectionGuid: string\) => \{/,
    '任务详情应该提供切换单个任务分组的处理函数',
  )
  assert.match(
    detailSource,
    /const handleRemoveTaskFromSection = async \(sectionGuid: string\) => \{/,
    '任务详情应该提供移除单个任务分组的处理函数',
  )

  const addSectionBlock = extractFunctionBlock(
    detailSource,
    'const handleAddTaskToSection = async (sectionGuid: string) => {',
    'const handleRemoveTaskFromSection = async (sectionGuid: string) => {',
  )

  assert.match(
    addSectionBlock,
    /await moveTaskToSection\(task\.guid, sectionGuid\)/,
    '任务详情切换任务分组时应该直接走分组切换接口，避免页面看起来没有变化',
  )
  assert.match(
    addSectionBlock,
    /message\.success\('已切换任务分组'\)/,
    '任务详情切换任务分组成功后应该给出切换成功提示',
  )
  assert.match(
    addSectionBlock,
    /onTaskUpdated\?\.\(nextTask\)/,
    '任务详情切换任务分组时应该先乐观更新本地状态，避免页面保持旧分组',
  )
  assert.doesNotMatch(
    addSectionBlock,
    /await handleTaskPatch\(\{\s*tasklists: nextTasklists,\s*\}\)/,
    '任务详情切换任务分组时不应该继续走 tasklists 追加回写',
  )
  assert.match(
    detailSource,
    /className="tasklist-section-tags"/,
    '已添加的任务分组应该改成独立标签区，和搜索结果列表分开展示',
  )
  assert.match(
    detailSource,
    /className="tasklist-section-chip"/,
    '每个已添加任务分组都应该有独立 chip 样式，参考图里的红框区域',
  )
  assert.match(
    detailSource,
    /className="tasklist-section-search"/,
    '弹层里应该有独立的任务分组搜索输入框，参考图里的蓝框区域顶部',
  )
  assert.match(
    detailSource,
    /className="tasklist-section-search-list"/,
    '搜索中的任务分组候选列表应该有独立容器，方便控制滚动和 hover 态',
  )
  assert.match(
    detailSource,
    /搜索或新建任务清单/,
    '任务分组搜索输入框文案应和参考图保持一致',
  )
  assert.match(
    detailSource,
    /已添加任务分组/,
    '弹层里应该明确区分“已添加任务分组”和搜索结果',
  )
  assert.doesNotMatch(
    detailSource,
    /\+\s*添加至任务清单/,
    '任务详情里不应该再单独渲染“添加至任务清单”入口，避免和上面的清单分组区域重复',
  )
  assert.match(
    styleSource,
    /\.tasklist-section-tags \{/,
    '详情页样式里应该增加已添加任务分组标签区样式',
  )
  assert.match(
    styleSource,
    /\.tasklist-section-chip \{/,
    '详情页样式里应该增加任务分组标签样式',
  )
  assert.match(
    styleSource,
    /\.tasklist-section-search-list \{/,
    '详情页样式里应该增加任务分组搜索列表样式',
  )
}

async function main() {
  await testTaskServiceSupportsTasklistsPatch()
  await testTaskDetailPanelRendersMultiSectionSelector()
  console.log('task detail multi section regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
