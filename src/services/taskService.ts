import { request } from './request'
import { appConfig } from '@/config/appConfig'
import type { Task, Priority } from '@/types/task'

export interface ApiTask {
  task_id: string
  project_id: string
  team_id: string
  parent_task_id: string | null
  depth: number
  title: string
  description: string | null
  status: string
  priority: string
  tags: string[]
  section_id: string
  creator_id: string
  assignee_id: string | null
  participant_ids: string[]
  follower_ids: string[]
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  involved_user_ids: string[]
  attachment_count: number
  comment_count: number
  subtask_count: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  is_starred: boolean
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

const priorityStringToNum: Record<string, Priority> = {
  low: 1 as Priority,
  medium: 2 as Priority,
  high: 3 as Priority,
  urgent: 4 as Priority,
}

const priorityNumToString: Record<number, string> = {
  0: 'medium',
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'urgent',
}

export function apiTaskToTask(api: ApiTask, projectId?: string): Task {
  const members = [
    ...(api.assignee_id
      ? [{ id: api.assignee_id, role: 'assignee' as const, type: 'user' as const }]
      : []),
    ...api.participant_ids
      .filter((id) => id !== api.assignee_id)
      .map((id) => ({ id, role: 'assignee' as const, type: 'user' as const })),
    ...api.follower_ids.map((id) => ({
      id,
      role: 'follower' as const,
      type: 'user' as const,
    })),
  ]

  const tlGuid = projectId ?? api.project_id

  return {
    guid: api.task_id,
    task_id: api.task_id,
    summary: api.title,
    description: api.description ?? '',
    status: api.status === 'done' ? 'done' : 'todo',
    completed_at: api.completed_at
      ? new Date(api.completed_at).getTime().toString()
      : '0',
    created_at: new Date(api.created_at).getTime().toString(),
    updated_at: new Date(api.updated_at).getTime().toString(),
    creator: { id: api.creator_id, type: 'user' },
    mode: 2,
    priority: (priorityStringToNum[api.priority] ?? 0) as Priority,
    is_milestone: false,
    source: 1,
    parent_task_guid: api.parent_task_id ?? '',
    subtask_count: api.subtask_count,
    members,
    tasklists: [{ tasklist_guid: tlGuid, section_guid: api.section_id }],
    dependencies: [],
    custom_fields: [],
    reminders: [],
    start: api.start_date
      ? { timestamp: new Date(api.start_date).getTime().toString(), is_all_day: false }
      : undefined,
    due: api.due_date
      ? { timestamp: new Date(api.due_date).getTime().toString(), is_all_day: false }
      : undefined,
    url: '',
  }
}

// ---- List / Get ----

export async function listTasks(params: {
  project_id?: string
  status?: string
  section_id?: string
  assignee_id?: string
  creator_id?: string
  involved_user_id?: string
  is_starred?: boolean
  keyword?: string
  sort_by?: string
  order?: string
  page?: number
  page_size?: number
}): Promise<{ items: ApiTask[]; total: number }> {
  const qs = new URLSearchParams({
    user_id: appConfig.user_id,
    team_id: appConfig.team_id,
  })
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  }
  const resp = await request<PaginatedResponse<ApiTask>>(
    `api/v1/task-center/tasks?${qs}`,
  )
  return { items: resp.items, total: resp.total }
}

export function getTask(taskId: string): Promise<ApiTask> {
  return request<ApiTask>(
    `api/v1/task-center/tasks/${taskId}?user_id=${encodeURIComponent(appConfig.user_id)}`,
  )
}

export function listSubtasks(taskId: string): Promise<ApiTask[]> {
  return request<ApiTask[]>(
    `api/v1/task-center/tasks/${taskId}/subtasks?user_id=${encodeURIComponent(appConfig.user_id)}`,
  )
}

// ---- Create / Update / Delete ----

export function createTaskApi(payload: {
  project_id: string
  title: string
  description?: string
  parent_task_id?: string
  assignee_id?: string
  priority?: string
  tags?: string[]
  section_id?: string
  start_date?: string
  due_date?: string
}): Promise<ApiTask> {
  return request<ApiTask>('api/v1/task-center/tasks', {
    method: 'POST',
    body: JSON.stringify({ user_id: appConfig.user_id, ...payload }),
  })
}

export function updateTaskApi(
  taskId: string,
  patch: {
    title?: string
    description?: string
    status?: string
    priority?: string
    assignee_id?: string | null
    tags?: string[]
    start_date?: string | null
    due_date?: string | null
  },
): Promise<ApiTask> {
  return request<ApiTask>(`api/v1/task-center/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: appConfig.user_id, ...patch }),
  })
}

export function deleteTaskApi(taskId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/tasks/${taskId}?user_id=${encodeURIComponent(appConfig.user_id)}`,
    { method: 'DELETE' },
  )
}

// ---- Patch endpoints ----

export function patchTaskStatus(
  taskId: string,
  status: string,
): Promise<ApiTask> {
  return request<ApiTask>(`api/v1/task-center/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: appConfig.user_id, status }),
  })
}

export function patchTaskAssignee(
  taskId: string,
  assigneeId: string | null,
): Promise<ApiTask> {
  return request<ApiTask>(`api/v1/task-center/tasks/${taskId}/assignee`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: appConfig.user_id, assignee_id: assigneeId }),
  })
}

export function patchTaskSortOrder(
  taskId: string,
  sortOrder: number,
): Promise<void> {
  return request<void>(`api/v1/task-center/tasks/${taskId}/sort-order`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: appConfig.user_id, sort_order: sortOrder }),
  })
}

// ---- Participants / Followers ----

export function addParticipants(
  taskId: string,
  userIds: string[],
): Promise<void> {
  return request<void>(`api/v1/task-center/tasks/${taskId}/participants`, {
    method: 'POST',
    body: JSON.stringify({ user_id: appConfig.user_id, user_ids: userIds }),
  })
}

export function removeParticipant(
  taskId: string,
  targetUserId: string,
): Promise<void> {
  return request<void>(
    `api/v1/task-center/tasks/${taskId}/participants/${targetUserId}?user_id=${encodeURIComponent(appConfig.user_id)}`,
    { method: 'DELETE' },
  )
}

export function addFollower(taskId: string): Promise<void> {
  return request<void>(`api/v1/task-center/tasks/${taskId}/followers`, {
    method: 'POST',
    body: JSON.stringify({ user_id: appConfig.user_id }),
  })
}

export function removeFollower(taskId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/tasks/${taskId}/followers?user_id=${encodeURIComponent(appConfig.user_id)}`,
    { method: 'DELETE' },
  )
}

// ---- Star ----

export function starTask(taskId: string): Promise<void> {
  return request<void>(`api/v1/task-center/tasks/${taskId}/star`, {
    method: 'POST',
    body: JSON.stringify({ user_id: appConfig.user_id }),
  })
}

export function unstarTask(taskId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/tasks/${taskId}/star?user_id=${encodeURIComponent(appConfig.user_id)}`,
    { method: 'DELETE' },
  )
}

// ---- Batch ----

export function batchTasks(payload: {
  task_ids: string[]
  action: string
  status?: string
  assignee_id?: string
  priority?: string
  tags?: string[]
}): Promise<void> {
  return request<void>('api/v1/task-center/tasks/batch', {
    method: 'POST',
    body: JSON.stringify({ user_id: appConfig.user_id, ...payload }),
  })
}

// ---- Helpers ----

export function toPriorityString(p: number): string {
  return priorityNumToString[p] ?? 'medium'
}
