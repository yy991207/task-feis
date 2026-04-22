import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function testProjectServiceExposesDistributeApi() {
  const serviceSource = await readSource('../src/services/projectService.ts')

  assert.match(
    serviceSource,
    /export function distributeProject\(\s*projectId: string,\s*targetTeamIds: string\[\],?\s*\)\s*:\s*Promise<void>/,
    'projectService 应该暴露清单分享接口方法',
  )
  assert.match(
    serviceSource,
    /api\/v1\/task-center\/projects\/\$\{projectId\}\/distribute/,
    '清单分享接口应该命中 projects/{project_id}/distribute',
  )
  assert.match(
    serviceSource,
    /target_team_ids: targetTeamIds/,
    '清单分享请求体应该传 target_team_ids',
  )
}

async function testSidebarReplacesCopyLinkWithShareAction() {
  const sidebarSource = await readSource('../src/components/Sidebar/index.tsx')

  assert.doesNotMatch(
    sidebarSource,
    /label: '复制链接'/,
    '清单三点菜单里不应该再保留“复制链接”入口',
  )
  assert.match(
    sidebarSource,
    /label: '分享'/,
    '清单三点菜单里应该把入口文案改成“分享”',
  )
  assert.match(
    sidebarSource,
    /const \[shareModalProject, setShareModalProject\] = useState<Project \| null>\(null\)/,
    '侧边栏应该维护当前待分享的清单状态',
  )
  assert.match(
    sidebarSource,
    /Modal[\s\S]*title="分享清单"/,
    '点击分享后应该弹出分享清单弹窗',
  )
  assert.match(
    sidebarSource,
    /mode="multiple"/,
    '分享弹窗里的团队选择应该支持多选',
  )
  assert.match(
    sidebarSource,
    /distributeProject\(shareModalProject\.project_id,\s*selectedShareTeamIds\)/,
    '确认分享时应该调用清单分发接口',
  )
}

async function testSidebarFiltersManageableTeamsByCurrentUserRole() {
  const sidebarSource = await readSource('../src/components/Sidebar/index.tsx')

  assert.match(
    sidebarSource,
    /const teams = await listTeams\(\)/,
    '打开分享弹窗时应该先加载当前用户关联的团队列表',
  )
  assert.match(
    sidebarSource,
    /const membersByTeam = await Promise\.all\(\s*teams\.map\(\(team\) => listMembers\(team\.team_id\)/,
    '打开分享弹窗时应该再按团队批量加载成员角色',
  )
  assert.match(
    sidebarSource,
    /member\.role === 'owner' \|\| member\.role === 'admin'/,
    '分享弹窗里应该只保留当前 user_id 下可管理的团队',
  )
  assert.match(
    sidebarSource,
    /team\.team_id !== project\.team_id/,
    '分享目标团队列表里应该排除当前清单所在团队，避免重复分享给自己',
  )
}

async function main() {
  await testProjectServiceExposesDistributeApi()
  await testSidebarReplacesCopyLinkWithShareAction()
  await testSidebarFiltersManageableTeamsByCurrentUserRole()
  console.log('sidebar tasklist share regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
