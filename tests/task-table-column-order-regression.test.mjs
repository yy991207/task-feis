import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function testSystemFieldsMapBackToBuiltInColumns() {
  const source = await readTaskTableSource()
  const mapStart = source.indexOf('const systemFieldIdToColumnKeyMap')
  const mapEnd = source.indexOf('}', mapStart)
  const mapSource = source.slice(mapStart, mapEnd)

  assert.notEqual(mapStart, -1, 'TaskTable 里应该有系统字段到列表列 key 的映射表')
  assert.match(mapSource, /assignee_ids: 'assignee'/, '负责人系统字段应该映射回 assignee 列')
  assert.match(mapSource, /due_date: 'due'/, '截止日期系统字段应该映射回 due 列')
  assert.match(mapSource, /start_date: 'start'/, '开始日期系统字段应该映射回 start 列')
  assert.match(mapSource, /creator_id: 'creator'/, '创建人系统字段应该映射回 creator 列')
  assert.match(mapSource, /created_at: 'created'/, '创建时间系统字段应该映射回 created 列')
  assert.match(
    source,
    /function resolveRawFieldColumnKey\(field: ApiCustomField\): ExtendedColumnKey \| null \{/,
    'TaskTable 应该集中把后端字段定义解析成前端列 key，避免字段顺序和显示逻辑散在各处',
  )
  assert.match(
    source,
    /buildVisibleColumnKeys = useCallback\([\s\S]*resolveRawFieldColumnKey\(field\)/,
    '加载字段配置时应该按解析后的真实列 key 生成可见列顺序',
  )
}

async function testFieldConfigPanelSupportsDraggingPersistedFields() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /interface FieldOption \{[\s\S]*fieldId\?: string/,
    '字段配置列表项应该带上后端 fieldId，拖动排序和显示隐藏才能直接回写接口',
  )
  assert.match(
    source,
    /draggable=\{Boolean\(field\.fieldId\)\}/,
    '字段配置列表里所有有后端 fieldId 的字段都应该支持拖动，不应该只限自定义字段',
  )
  assert.match(
    source,
    /event\.dataTransfer\.setData\('application\/x-custom-field', field\.fieldId\)/,
    '字段配置拖拽开始时应该直接记录当前字段的 fieldId',
  )
  assert.match(
    source,
    /void handleCustomFieldSort\(dragFieldId, field\.fieldId\)/,
    '字段配置拖拽落点应该按 fieldId 重排，系统字段和自定义字段都走同一套排序逻辑',
  )
}

async function testVisibleColumnsRenderInUserAdjustedOrder() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const orderedVisibleColumnKeys = visibleColumnKeys\.filter\(\(key\) => key !== 'title'\)/,
    '主表字段渲染前应该先按当前可见列顺序拿到非标题字段列表',
  )
  assert.match(
    source,
    /orderedVisibleColumnKeys\.forEach\(\(columnKey\) => \{[\s\S]*if \(String\(columnKey\)\.startsWith\('custom:'\)\)/,
    '主表字段列应该按 visibleColumnKeys 的顺序逐个渲染，自定义字段也要能插到中间位置',
  )
}

async function testColumnHeaderMenuSupportsMoveAndHide() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /function renderAdjustableColumnTitle\([\s\S]*向左移动[\s\S]*向右移动[\s\S]*隐藏字段/,
    '除任务标题外的表头都应该挂字段顺序菜单，至少支持向左、向右和隐藏',
  )
  assert.match(
    source,
    /const handleMoveVisibleColumn = async \(\s*columnKey: Exclude<ExtendedColumnKey, 'title'>,\s*direction: 'left' \| 'right'/,
    'TaskTable 应该有独立的字段左右移动处理函数，避免把顺序逻辑散在 JSX 菜单里',
  )
  assert.match(
    source,
    /const handleHideVisibleColumn = async \(columnKey: ExtendedColumnKey\) => \{/,
    'TaskTable 应该有独立的字段隐藏处理函数，表头菜单和字段配置眼睛按钮才能复用',
  )
  assert.match(
    source,
    /renderAdjustableColumnTitle\(\s*'priority',/,
    '优先级表头应该接入字段顺序菜单',
  )
  assert.match(
    source,
    /renderAdjustableColumnTitle\(\s*'assignee',/,
    '负责人表头应该接入字段顺序菜单',
  )
  assert.match(
    source,
    /renderAdjustableColumnTitle\(\s*'due',/,
    '截止时间表头应该接入字段顺序菜单',
  )
}

async function testReloadKeepsMixedVisibleColumnOrderStable() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const mergeVisibleColumnKeys = useCallback\(\s*\(\s*prevKeys: ExtendedColumnKey\[],\s*fields: ApiCustomField\[\]/,
    '字段重新加载后应该用统一函数合并当前顺序和后端字段顺序，避免本地列被直接顶到末尾',
  )
  assert.match(
    source,
    /setVisibleColumnKeys\(\(prev\) => mergeVisibleColumnKeys\(prev, list\)\)/,
    '无论首屏加载还是 reload，都应该复用同一套字段顺序合并逻辑',
  )
  assert.match(
    source,
    /const hasPersistedFieldOrderChange = reorderedFields\.some\(\(field\) => \{[\s\S]*field\.sort_order !== originalField\.sort_order[\s\S]*field\.is_visible !== originalField\.is_visible/,
    '左右移动时应该先判断后端字段顺序或显隐是否真的变化，避免只动本地列也触发回写',
  )
  assert.match(
    source,
    /if \(!hasPersistedFieldOrderChange\) \{\s*return\s*\}/,
    '只移动没有后端字段的本地列时不应该再 reload 字段列表，否则本地顺序会被冲掉',
  )
}

async function main() {
  await testSystemFieldsMapBackToBuiltInColumns()
  await testFieldConfigPanelSupportsDraggingPersistedFields()
  await testVisibleColumnsRenderInUserAdjustedOrder()
  await testColumnHeaderMenuSupportsMoveAndHide()
  await testReloadKeepsMixedVisibleColumnOrderStable()
  console.log('task table column order regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
