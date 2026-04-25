import { readFileSync } from 'node:fs'

const files = {
  preview: 'src/components/NameOverflowPreview/index.tsx',
  table: 'src/components/TaskTable/index.tsx',
  tableStyle: 'src/components/TaskTable/index.less',
  detail: 'src/components/TaskDetailPanel/index.tsx',
  sidebar: 'src/components/Sidebar/index.tsx',
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'),
  ]),
)

const failures = []

if (!source.preview.includes('<Tooltip')) {
  failures.push(`${files.preview}: 预览组件还没有接入悬停查看。`)
}

if (source.preview.includes('<Popover')) {
  failures.push(`${files.preview}: 预览组件还残留白底固定提示。`)
}

if (!source.preview.includes('mouseEnterDelay={0.4}')) {
  failures.push(`${files.preview}: 预览组件还没有给悬停查看加延迟，容易误触。`)
}

if (!source.table.includes('<NameOverflowPreview') || !source.table.includes('task.summary')) {
  failures.push(`${files.table}: 主页面任务标题还没有接入长名称预览。`)
}

if (!source.table.includes('config.title')) {
  failures.push(`${files.table}: 主页面清单标题断言失效，请检查脚本。`)
}

if (!source.table.includes('previewClassName="table-title-name-preview"')) {
  failures.push(`${files.table}: 主页面清单标题还没有接入长名称预览。`)
}

if (!source.tableStyle.includes('max-width: min(100%, 720px);')) {
  failures.push(`${files.tableStyle}: 主页面清单标题还没有加限宽，省略显示不会触发。`)
}

if (!source.tableStyle.includes('.table-title-meta') || !source.tableStyle.includes('overflow: hidden;')) {
  failures.push(`${files.tableStyle}: 主页面清单标题容器还没有限制溢出。`)
}

if (!source.detail.includes('previewClassName="detail-title-name-preview"')) {
  failures.push(`${files.detail}: 任务详情标题还没有接入长名称预览。`)
}

if (!source.detail.includes('previewClassName="detail-subtask-name-preview"')) {
  failures.push(`${files.detail}: 详情页子任务标题还没有接入长名称预览。`)
}

if (!source.detail.includes('previewClassName="detail-tasklist-name-preview"')) {
  failures.push(`${files.detail}: 详情页任务清单名称还没有接入长名称预览。`)
}

if (!source.sidebar.includes('previewClassName="sidebar-tasklist-name-preview"')) {
  failures.push(`${files.sidebar}: 左侧任务清单名称还没有接入长名称预览。`)
}

if (failures.length > 0) {
  console.error('发现任务名称长文本预览还没接通：')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('任务名称长文本预览已接通。')
