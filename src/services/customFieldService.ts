import { appConfig } from '@/config/appConfig'
import { request } from './request'

export type CustomFieldType =
  | 'select'
  | 'multi_select'
  | 'number'
  | 'text'
  | 'date'
  | 'member'

export interface FieldOption {
  value: string
  label: string
  color?: string | null
}

export interface ApiCustomField {
  field_id: string
  project_id: string
  name: string
  field_type: CustomFieldType
  options: FieldOption[] | null
  required: boolean
  created_at: string
  updated_at: string
  is_deleted?: boolean
}

const uid = () => encodeURIComponent(appConfig.user_id)

export async function listCustomFields(projectId: string): Promise<ApiCustomField[]> {
  const res = await request<ApiCustomField[] | { items: ApiCustomField[] }>(
    `api/v1/task-center/projects/${projectId}/custom-fields?user_id=${uid()}`,
  )
  return Array.isArray(res) ? res : (res?.items ?? [])
}

export async function createCustomField(
  projectId: string,
  data: {
    name: string
    field_type: CustomFieldType
    options?: FieldOption[]
    required?: boolean
  },
): Promise<ApiCustomField> {
  return request<ApiCustomField>(
    `api/v1/task-center/projects/${projectId}/custom-fields`,
    {
      method: 'POST',
      body: JSON.stringify({
        user_id: appConfig.user_id,
        name: data.name,
        field_type: data.field_type,
        options: data.options ?? null,
        required: data.required ?? false,
      }),
    },
  )
}

export async function updateCustomField(
  fieldId: string,
  patch: { name?: string; options?: FieldOption[]; required?: boolean },
): Promise<ApiCustomField> {
  return request<ApiCustomField>(`api/v1/task-center/custom-fields/${fieldId}`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: appConfig.user_id, ...patch }),
  })
}

export async function deleteCustomField(fieldId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/custom-fields/${fieldId}?user_id=${uid()}`,
    { method: 'DELETE' },
  )
}

export async function patchTaskCustomFields(
  taskId: string,
  customFields: Record<string, unknown>,
): Promise<void> {
  return request<void>(`api/v1/task-center/tasks/${taskId}/custom-fields`, {
    method: 'PATCH',
    body: JSON.stringify({
      user_id: appConfig.user_id,
      custom_fields: customFields,
    }),
  })
}
