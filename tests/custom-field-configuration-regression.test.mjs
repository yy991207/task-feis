import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskTableSource() {
  return readFile(new URL('../src/components/TaskTable/index.tsx', import.meta.url), 'utf8')
}

async function readTaskTableStyle() {
  return readFile(new URL('../src/components/TaskTable/index.less', import.meta.url), 'utf8')
}

async function testCreatedCustomFieldBecomesVisibleColumn() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const handleCustomFieldSaved = async \(field: ApiCustomField\)/,
    '新建自定义字段保存后应该有统一回调，不能只刷新字段列表',
  )
  assert.match(
    source,
    /handleAddVisibleColumn\(toCustomFieldColumnKey\(field\.field_id\)\)/,
    '新建自定义字段保存后应该自动加入当前表格可见列，用户才能继续配置字段值',
  )
  assert.match(
    source,
    /onSaved=\{\(field\) => void handleCustomFieldSaved\(field\)\}/,
    '自定义字段编辑弹窗保存成功后应该调用自动显示字段列的回调',
  )
}

async function testCustomFieldCellCanEditValues() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /import \{[\s\S]*patchTaskCustomFields[\s\S]*\} from '@\/services\/customFieldService'/,
    '任务表格应该调用自定义字段值保存接口，而不是只展示字段文本',
  )
  assert.match(
    source,
    /function CustomFieldCell\(/,
    '自定义字段列应该有独立单元格组件，负责按字段类型渲染编辑控件',
  )
  assert.match(
    source,
    /handleCustomFieldValueChange/,
    '自定义字段单元格变更后应该统一保存并同步本地任务状态',
  )
  assert.match(
    source,
    /visibleCustomFieldDefs\.forEach\(\(field\) => \{[\s\S]*<CustomFieldCell[\s\S]*field=\{field\}[\s\S]*onChange=\{\(value\) => void handleCustomFieldValueChange\(record, field, value\)\}/,
    '自定义字段列渲染时应该在 antd Table 列里接入可编辑单元格，而不是只输出格式化文本',
  )
}

async function testCustomFieldTypeMenuAnchorsInsidePanel() {
  const source = await readTaskTableSource()
  const panelStart = source.indexOf('const fieldConfigPanel = (')
  const panelEnd = source.indexOf('const quickAddFieldPanel = (')
  const panelSource = source.slice(panelStart, panelEnd)

  assert.doesNotMatch(
    panelSource,
    /<Dropdown[\s\S]*className="field-config-create-btn"/,
    '新建自定义字段类型菜单不应该挂在按钮自己的 Dropdown 上，否则浮层会贴着按钮展开',
  )
  assert.match(
    source,
    /const \[customFieldTypeMenuOpen, setCustomFieldTypeMenuOpen\] = useState\(false\)/,
    '字段配置面板应该自己维护字段类型菜单开关，才能把菜单固定在面板右侧',
  )
  assert.match(
    source,
    /field-config-side-panel field-config-type-menu/,
    '字段类型菜单应该作为字段配置面板内部的侧边区域渲染',
  )
  assert.match(
    source,
    /className="field-config-layout"/,
    '字段配置 UI 应该使用左右双列布局容器，复刻截图里的双层面板结构',
  )
  assert.match(
    source,
    /className="field-config-main-panel"/,
    '左侧字段列表应该有独立主面板容器',
  )
  assert.match(
    source,
    /field-config-side-panel field-config-type-menu/,
    '右侧字段类型列表应该有独立侧边面板容器',
  )
  assert.match(
    panelSource,
    /field-config-side-item field-config-side-item-link[\s\S]*选择已创建的字段/,
    '字段配置主菜单右侧类型面板底部也应该提供“选择已创建的字段”入口',
  )
  assert.match(
    panelSource,
    /onClick=\{handleOpenExistingFieldPicker\}/,
    '字段配置主菜单右侧类型面板里的“选择已创建的字段”入口应该复用现有打开逻辑',
  )
  assert.match(
    source,
    /const handleOpenExistingFieldPicker = \(\) => \{[\s\S]*closeFieldConfig\(\)[\s\S]*closeHeaderQuickAdd\(\)[\s\S]*setEditorInitialTab\('existing'\)[\s\S]*setEditorOpen\(true\)/,
    '点击“选择已创建的字段”后应该先关闭字段配置浮层，再打开已创建字段弹窗',
  )
}

async function testTableHeaderDoesNotRenderStandaloneAddFieldPlus() {
  const source = await readTaskTableSource()
  const quickAddColumnStart = source.indexOf("key: 'quickAddCustomField'")
  const quickAddColumnEnd = source.indexOf('const buildTableRows = () =>', quickAddColumnStart)
  const quickAddColumnSource = source.slice(quickAddColumnStart, quickAddColumnEnd)

  assert.match(
    source,
    /const \[headerAddOpen, setHeaderAddOpen\] = useState\(false\)/,
    '表头右侧应该单独维护一个新增字段快捷入口的开关状态',
  )
  assert.match(
    source,
    /key: 'quickAddCustomField'[\s\S]*overlayClassName="field-config-popover field-config-popover-quick-add"[\s\S]*open=\{headerAddOpen\}[\s\S]*content=\{quickAddFieldPanel\}/,
    '表头右侧加号入口应该通过单独的 Popover 打开快速新增字段面板',
  )
  assert.match(
    source,
    /className="toolbar-quick-add-field-btn"[\s\S]*icon={<PlusOutlined \/>}/,
    '表头右侧应该渲染独立的新增字段加号按钮',
  )
  assert.notEqual(
    quickAddColumnStart,
    -1,
    '任务表格列定义里应该存在独立的快速新增字段列',
  )
  assert.doesNotMatch(
    quickAddColumnSource,
    /content=\{fieldConfigPanel\}/,
    '表头右侧加号入口打开后不应该再复用完整字段配置面板',
  )
}

async function testQuickAddFieldPanelOnlyShowsTypeMenu() {
  const source = await readTaskTableSource()

  const panelStart = source.indexOf('const quickAddFieldPanel = (')
  const panelEnd = source.indexOf('const createTaskInlineRow =')
  const panelSource = source.slice(panelStart, panelEnd)

  assert.notEqual(
    panelStart,
    -1,
    '任务表头右侧应该提供独立的快速新增字段面板',
  )
  assert.doesNotMatch(
    panelSource,
    /field-config-main-panel/,
    '快速新增字段面板里不应该再显示左侧字段配置主面板',
  )
  assert.match(
    panelSource,
    /className="field-config-side-panel field-config-type-menu field-config-type-menu-standalone"/,
    '快速新增字段面板应该直接渲染独立的字段类型菜单容器',
  )
  assert.match(
    panelSource,
    /field-config-side-section-title">基础字段<\/div>/,
    '快速新增字段面板应该直接从基础字段类型开始展示',
  )
  assert.match(
    panelSource,
    /field-config-side-section-title">推荐字段<\/div>/,
    '快速新增字段面板应该继续展示推荐字段分组',
  )
  assert.match(
    panelSource,
    /选择已创建的字段/,
    '快速新增字段面板底部应该保留选择已创建字段入口',
  )
}

async function testQuickAddFieldStyleExists() {
  const style = await readTaskTableStyle()

  assert.match(
    style,
    /\.toolbar-quick-add-field-btn/,
    '任务表格样式里应该提供表头快速新增字段按钮样式',
  )
  assert.match(
    style,
    /\.field-config-type-menu-standalone/,
    '任务表格样式里应该提供独立单列快捷字段面板样式',
  )
  assert.match(
    style,
    /\.toolbar-quick-add-field-btn[\s\S]*border:\s*none\s*!important;/,
    '表头快速新增字段按钮不应该再带边框，只保留加号图标',
  )
  assert.match(
    style,
    /\.toolbar-quick-add-field-btn[\s\S]*color:\s*#1f2329\s*!important;/,
    '表头快速新增字段按钮的加号应该使用黑色文字色',
  )
}

async function testSystemBuiltInFieldDoesNotShowEditAction() {
  const source = await readTaskTableSource()

  assert.match(
    source,
    /const isSystemBuiltInField = cfRaw\?\.creator_id === 'system'/,
    '字段配置行应该先识别 system 创建的系统内置字段，避免把权限判断散在 JSX 里',
  )
  assert.match(
    source,
    /\{cfRaw && !isSystemBuiltInField && \(/,
    'creator_id 为 system 的字段不应该显示编辑铅笔入口',
  )
}

async function main() {
  await testCreatedCustomFieldBecomesVisibleColumn()
  await testCustomFieldCellCanEditValues()
  await testCustomFieldTypeMenuAnchorsInsidePanel()
  await testTableHeaderDoesNotRenderStandaloneAddFieldPlus()
  await testQuickAddFieldPanelOnlyShowsTypeMenu()
  await testQuickAddFieldStyleExists()
  await testSystemBuiltInFieldDoesNotShowEditAction()
  console.log('custom field configuration regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
