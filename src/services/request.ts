import { appConfig } from '@/config/appConfig'

export interface ApiResponse<T> {
  success: boolean
  code: string
  msg: string
  data: T
}

function buildUrl(path: string): string {
  const base = appConfig.url.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}

function authHeaders(): HeadersInit {
  return appConfig.token ? { Authorization: `Bearer ${appConfig.token}` } : {}
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isJsonBody = options?.body && !(options.body instanceof FormData)
  const res = await fetch(buildUrl(path), {
    ...options,
    headers: {
      ...authHeaders(),
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  const json: ApiResponse<T> = await res.json()
  if (!json.success) {
    throw new Error(json.msg || `请求失败 (${json.code})`)
  }
  return json.data
}
