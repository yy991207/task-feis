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

export function switchCurrentUser(userId: string): void {
  localStorage.setItem('current_user_id', userId)
  window.location.reload()
}
