import { appConfig } from '@/config/appConfig'
import type { FieldOption } from './customFieldService'
import { request } from './request'

export type UserFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'member'
  | 'select'
  | 'multi_select'

export interface UserFieldConfig {
  field_id: string
  name: string
  field_type: UserFieldType
  required?: boolean
  is_visible?: boolean
  is_system?: boolean
  data_source: 'top' | 'custom_fields'
  options?: FieldOption[] | null
  render_hint?: string | null
  alias_field_ids: string[]
  sort_order: number
}

export function listUserFieldConfig(
  userId = appConfig.user_id,
): Promise<UserFieldConfig[]> {
  return request<UserFieldConfig[]>(
    `api/v1/task-center/users/${encodeURIComponent(userId)}/field-config`,
  )
}
