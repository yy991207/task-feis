import { readFileSync } from 'node:fs'

const sidebarFile = 'src/components/Sidebar/index.tsx'
const switcherFile = 'src/components/UserSwitcher/index.tsx'
const sidebarStyleFile = 'src/components/Sidebar/index.less'

const sidebarSource = readFileSync(new URL(`../${sidebarFile}`, import.meta.url), 'utf8')
const switcherSource = readFileSync(new URL(`../${switcherFile}`, import.meta.url), 'utf8')
const sidebarStyleSource = readFileSync(new URL(`../${sidebarStyleFile}`, import.meta.url), 'utf8')

const failures = []

if (!sidebarSource.includes("import UserSwitcher from '@/components/UserSwitcher'")) {
  failures.push(`${sidebarFile}: 侧边栏头部还没有重新引入 UserSwitcher。`)
}

if (!sidebarSource.includes('<UserSwitcher />')) {
  failures.push(`${sidebarFile}: 侧边栏头部还没有显示身份切换入口。`)
}

if (sidebarSource.includes('title="团队管理"')) {
  failures.push(`${sidebarFile}: 这次不该把团队管理入口一起恢复出来。`)
}

if (!sidebarSource.includes('<NotificationBell />')) {
  failures.push(`${sidebarFile}: 通知入口必须继续保留。`)
}

if (!switcherSource.includes("label: '切换团队'")) {
  failures.push(`${switcherFile}: 身份切换下拉里缺少“切换团队”入口。`)
}

if (!switcherSource.includes("label: '切换当前身份'")) {
  failures.push(`${switcherFile}: 身份切换下拉里缺少“切换当前身份”入口。`)
}

if (!sidebarStyleSource.includes('.sidebar-header-actions')) {
  failures.push(`${sidebarStyleFile}: 侧边栏头部操作区样式还没补上，按钮排布可能会挤压。`)
}

if (failures.length > 0) {
  console.error('发现侧边栏头部的身份切换入口还没有恢复完整：')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('侧边栏头部的身份切换入口已恢复。')
