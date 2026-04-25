import { readFileSync } from 'node:fs'

const file = 'src/components/Sidebar/index.tsx'
const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const failures = []

if (!source.includes("key: 'rename'") || !source.includes("label: '重命名'")) {
  failures.push(`${file}: 清单菜单缺少“重命名”项。`)
}

if (!source.includes("key: 'delete'") || !source.includes("label: '删除'")) {
  failures.push(`${file}: 清单菜单缺少“删除”项。`)
}

if (source.includes("label: '重命名清单'")) {
  failures.push(`${file}: 清单菜单里还保留着“重命名清单”。`)
}

if (source.includes("label: '移除清单'")) {
  failures.push(`${file}: 清单菜单里还保留着“移除清单”。`)
}

if (source.includes("label: '分享'")) {
  failures.push(`${file}: 清单菜单里还保留着“分享”。`)
}

if (source.includes("label: '归档清单'")) {
  failures.push(`${file}: 清单菜单里还保留着“归档清单”。`)
}

if (failures.length > 0) {
  console.error('发现清单三点菜单和预期不一致：')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('清单三点菜单只保留“重命名”和“删除”。')
