import { appConfig } from '@/config/appConfig'
import { request } from './request'

export interface ApiAttachment {
  attachment_id: string
  task_id: string
  file_name: string
  file_size: number
  mime_type: string | null
  url: string
  resource_id: string | null
  uploader_id: string
  created_at: string
  is_deleted?: boolean
}

const uid = () => encodeURIComponent(appConfig.user_id)

export async function listAttachments(taskId: string): Promise<ApiAttachment[]> {
  return request<ApiAttachment[]>(
    `api/v1/task-center/tasks/${taskId}/attachments?user_id=${uid()}`,
  )
}

export async function getAttachment(attachmentId: string): Promise<ApiAttachment> {
  return request<ApiAttachment>(
    `api/v1/task-center/attachments/${attachmentId}?user_id=${uid()}`,
  )
}

export async function uploadAttachment(
  taskId: string,
  file: File,
): Promise<ApiAttachment> {
  const form = new FormData()
  form.append('file', file)
  return request<ApiAttachment>(
    `api/v1/task-center/tasks/${taskId}/attachments?user_id=${uid()}`,
    { method: 'POST', body: form },
  )
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/attachments/${attachmentId}?user_id=${uid()}`,
    { method: 'DELETE' },
  )
}

export function buildAttachmentDownloadUrl(attachmentId: string): string {
  const base = appConfig.url.replace(/\/+$/, '')
  return `${base}/api/v1/task-center/attachments/${attachmentId}/download?user_id=${uid()}`
}

export async function downloadAttachment(
  attachmentId: string,
  fileName?: string,
): Promise<void> {
  const url = buildAttachmentDownloadUrl(attachmentId)
  const headers: HeadersInit = appConfig.token
    ? { Authorization: `Bearer ${appConfig.token}` }
    : {}
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`下载失败 (${res.status})`)
  }
  const blob = await res.blob()
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = fileName ?? 'attachment'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objUrl)
}
