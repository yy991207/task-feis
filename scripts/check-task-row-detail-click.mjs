import { readFileSync } from 'node:fs'

const file = 'src/components/TaskTable/index.tsx'
const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const failures = []

if (source.includes('<div className="cell cell-title" onClick={(e) => e.stopPropagation()}>')) {
  failures.push(`${file}: 标题整格还在阻止冒泡，点标题区域空白处不会打开任务详情。`)
}

if (!source.includes('<NameOverflowPreview')) {
  failures.push(`${file}: 标题区域还没有接入统一的长名称预览组件。`)
}

if (!source.includes('onDoubleClick={(e) => {')) {
  failures.push(`${file}: 标题文字还没有改成双击进入编辑态。`)
}

if (failures.length > 0) {
  console.error('发现任务行详情点击逻辑还没修好：')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('任务行空白区点击已可打开详情。')
