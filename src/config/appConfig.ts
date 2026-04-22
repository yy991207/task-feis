import yaml from '../../config.yaml?raw'

interface AppConfig {
  url: string
  user_id: string
  team_id: string
  token: string
}

function parseYaml(raw: string): AppConfig {
  const result: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) result[key] = value
  }
  return result as unknown as AppConfig
}

export const appConfig = parseYaml(yaml)

// Allow runtime user switching via localStorage.
// The switched user_id persists across reloads until cleared.
const storedUserId =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('current_user_id')
    : null
if (storedUserId) {
  appConfig.user_id = storedUserId
}

// 允许在运行时切换当前团队，并在刷新后继续沿用上次选中的团队。
const storedTeamId =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('current_team_id')
    : null
if (storedTeamId) {
  appConfig.team_id = storedTeamId
}

export function switchCurrentUser(userId: string): void {
  localStorage.setItem('current_user_id', userId)
  window.location.reload()
}

export function switchCurrentTeam(teamId: string): void {
  localStorage.setItem('current_team_id', teamId)
  window.location.reload()
}
