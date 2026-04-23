import { request } from './request'
import { appConfig } from '@/config/appConfig'

export type ViewScope = 'team' | 'personal'

export interface TaskView {
  view_id: string
  project_id: string
  name: string
  scope: ViewScope
  filters: ViewFilters
  creator_id?: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface ViewFilters {
  version?: number
  statusFilter?: 'all' | 'todo' | 'done'
  sortMode?: 'custom' | 'due' | 'start' | 'created'
  groupMode?: string
  filterConditions?: unknown[]
  [key: string]: unknown
}

export const DEFAULT_VIEW_NAME = '默认视图'

export function listViews(projectId: string): Promise<TaskView[]> {
  const qs = new URLSearchParams({ user_id: appConfig.user_id })
  return request<TaskView[]>(
    `api/v1/task-center/projects/${projectId}/views?${qs}`,
  )
}

export function getView(viewId: string): Promise<TaskView> {
  const qs = new URLSearchParams({ user_id: appConfig.user_id })
  return request<TaskView>(
    `api/v1/task-center/views/${viewId}?${qs}`,
  )
}

export function createView(
  projectId: string,
  body: { name: string; scope?: ViewScope; filters: ViewFilters },
): Promise<TaskView> {
  return request<TaskView>(`api/v1/task-center/projects/${projectId}/views`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: appConfig.user_id,
      name: body.name,
      scope: body.scope ?? 'personal',
      filters: body.filters,
    }),
  })
}

export function updateView(
  viewId: string,
  body: { name?: string; scope?: ViewScope; filters?: ViewFilters },
): Promise<TaskView> {
  return request<TaskView>(`api/v1/task-center/views/${viewId}`, {
    method: 'PUT',
    body: JSON.stringify({
      user_id: appConfig.user_id,
      ...body,
    }),
  })
}

export function deleteView(viewId: string): Promise<void> {
  const qs = new URLSearchParams({ user_id: appConfig.user_id })
  return request<void>(
    `api/v1/task-center/views/${viewId}?${qs}`,
    { method: 'DELETE' },
  )
}
