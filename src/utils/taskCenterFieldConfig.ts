import type { ApiCustomField } from '../services/customFieldService.ts'
import type { UserFieldConfig } from '../services/userFieldConfigService.ts'
import type { CustomFieldDef, CustomFieldValue, Task } from '../types/task.ts'

export type TaskTableFieldConfig = ApiCustomField & {
  alias_field_ids?: string[]
  data_source?: 'top' | 'custom_fields'
  is_system?: boolean
}

const USER_FIELD_CONFIG_PROJECT_ID = '__user_field_config__'
const USER_FIELD_CONFIG_CREATOR_ID = '__user_field_config__'

export function userFieldConfigToApiCustomField(
  field: UserFieldConfig,
): TaskTableFieldConfig {
  return {
    field_id: field.field_id,
    project_id: USER_FIELD_CONFIG_PROJECT_ID,
    name: field.name,
    field_type: field.field_type,
    render_hint: field.render_hint ?? null,
    options: field.options ?? null,
    required: field.required ?? false,
    is_visible: field.is_visible !== false,
    sort_order: field.sort_order,
    creator_id: field.is_system ? 'system' : USER_FIELD_CONFIG_CREATOR_ID,
    created_at: '',
    updated_at: '',
    alias_field_ids: field.alias_field_ids,
    data_source: field.data_source,
    is_system: field.is_system ?? false,
  }
}

export function getFieldAliasIds(
  field: Pick<CustomFieldDef, 'guid' | 'alias_field_ids'>,
): string[] {
  const aliasFieldIds = field.alias_field_ids?.filter(Boolean) ?? []
  if (aliasFieldIds.length > 0) {
    return aliasFieldIds
  }
  return [field.guid]
}

export function findTaskCustomFieldValue(
  task: Pick<Task, 'custom_fields'>,
  field: Pick<CustomFieldDef, 'guid' | 'alias_field_ids'>,
): CustomFieldValue | undefined {
  for (const aliasFieldId of getFieldAliasIds(field)) {
    const matchedValue = task.custom_fields.find((item) => item.guid === aliasFieldId)
    if (matchedValue) {
      return matchedValue
    }
  }
  return undefined
}

export function findTaskCustomFieldDisplayValue(
  task: Pick<Task, 'custom_fields_display'>,
  field: Pick<CustomFieldDef, 'guid' | 'alias_field_ids'>,
): unknown {
  for (const aliasFieldId of getFieldAliasIds(field)) {
    const value = task.custom_fields_display?.[aliasFieldId]
    if (value === undefined || value === null) {
      continue
    }
    if (typeof value === 'string' && !value.trim()) {
      continue
    }
    return value
  }
  return undefined
}
