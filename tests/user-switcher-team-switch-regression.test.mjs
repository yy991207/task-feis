import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function testAppConfigSupportsCurrentTeamSwitching() {
  const appConfigSource = await readSource('../src/config/appConfig.ts')

  assert.match(
    appConfigSource,
    /localStorage\.getItem\('current_team_id'\)/,
    'appConfig 应该支持从本地缓存读取当前团队，刷新后继续使用上次切换的团队',
  )
  assert.match(
    appConfigSource,
    /export function switchCurrentTeam\(teamId: string\): void \{/,
    'appConfig 应该暴露团队切换方法，供顶部切换器直接调用',
  )
  assert.match(
    appConfigSource,
    /localStorage\.setItem\('current_team_id', teamId\)/,
    '切换团队时应该把当前团队写回本地缓存',
  )
}

async function testUserSwitcherSupportsTeamSwitching() {
  const switcherSource = await readSource('../src/components/UserSwitcher/index.tsx')

  assert.match(
    switcherSource,
    /import \{ listMembers, listTeams, type Team, type TeamMember \} from '@\/services\/teamService'/,
    '身份切换器应该同时接入团队列表接口',
  )
  assert.match(
    switcherSource,
    /import \{ appConfig, switchCurrentTeam, switchCurrentUser \} from '@\/config\/appConfig'/,
    '身份切换器应该同时拿到用户和团队切换方法',
  )
  assert.match(
    switcherSource,
    /const \[teams, setTeams\] = useState<Team\[\] \| null>\(null\)/,
    '身份切换器应该维护当前用户可切换的团队列表',
  )
  assert.match(
    switcherSource,
    /listTeams\(\)/,
    '打开切换器时应该按当前 user_id 加载可参与的团队',
  )
  assert.match(
    switcherSource,
    /label: '切换团队'/,
    '下拉菜单里应该新增切换团队分组',
  )
  assert.match(
    switcherSource,
    /const handleSwitchTeam = \(teamId: string\) => \{/,
    '身份切换器应该有独立的团队切换处理函数',
  )
  assert.match(
    switcherSource,
    /switchCurrentTeam\(teamId\)/,
    '选择团队后应该真正切换当前 team_id',
  )
  assert.match(
    switcherSource,
    /const currentTeamId = appConfig\.team_id/,
    '身份切换器应该基于当前 team_id 标记选中项',
  )
}

async function main() {
  await testAppConfigSupportsCurrentTeamSwitching()
  await testUserSwitcherSupportsTeamSwitching()
  console.log('user switcher team switch regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
