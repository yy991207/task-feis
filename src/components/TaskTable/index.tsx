import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Input from 'antd/es/input'
import Checkbox from 'antd/es/checkbox'
import Popover from 'antd/es/popover'
import Calendar from 'antd/es/calendar'
import Select from 'antd/es/select'
import DatePicker from 'antd/es/date-picker'
import Button from 'antd/es/button'
import Dropdown from 'antd/es/dropdown'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Avatar from 'antd/es/avatar'
import Tag from 'antd/es/tag'
import Tooltip from 'antd/es/tooltip'
import Badge from 'antd/es/badge'
import Divider from 'antd/es/divider'
import theme from 'antd/es/theme'
import message from 'antd/es/message'
import {
  PlusOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SettingOutlined,
  EditOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  UserOutlined,
  UserAddOutlined,
  FileAddOutlined,
  FileTextFilled,
  SubnodeOutlined,
  EllipsisOutlined,
  FlagFilled,
  CheckSquareFilled,
  CheckCircleOutlined,
  AppstoreOutlined,
  DownOutlined,
  CheckOutlined,
  FontSizeOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  ReloadOutlined,
  UpOutlined,
  FlagOutlined,
  TeamOutlined,
  NumberOutlined,
  UnorderedListOutlined,
  HourglassOutlined,
  BranchesOutlined,
  TagOutlined,
  HistoryOutlined,
  IdcardOutlined,
  BarsOutlined,
  HolderOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { ColumnType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  Priority,
  PriorityLabel,
  PriorityColor,
  type Task,
  type User,
  type Member,
  type Tasklist,
  type Section,
  type CustomFieldDef,
  type CustomFieldValue,
} from '@/types/task'
import {
  createTaskApi,
  updateTaskApi,
  patchTaskStatus,
  patchTaskAssignee,
  addParticipants,
  getTask,
  apiTaskToTask,
  applyParticipantIdsToTask,
  buildDefaultParticipantIds,
  toPriorityString,
  listSubtasks,
} from '@/services/taskService'
import { updateProject } from '@/services/projectService'
import { listMembers } from '@/services/teamService'
import { appConfig } from '@/config/appConfig'
import {
  createSection as apiCreateSection,
  updateSectionSortOrder,
  moveTaskToSection,
  computeSectionSortOrder,
  deleteSection as apiDeleteSection,
  updateSection as apiUpdateSection,
} from '@/services/sectionService'
import type { ViewConfig, ColumnKey } from '@/config/viewConfig'
import EditableInput from '@/components/EditableInput'
import CustomFieldsModal from '@/components/CustomFieldsModal'
import CustomFieldEditorModal from '@/components/CustomFieldEditorModal'
import UserSearchSelect from '@/components/UserSearchSelect'
import TaskParentPickerModal from '@/components/TaskParentPickerModal'
import { inheritParentStartForTasks } from '@/utils/taskDate'
import {
  listCustomFields,
  updateCustomField,
  patchTaskCustomFields,
  type ApiCustomField,
  type CustomFieldType as ApiCustomFieldType,
} from '@/services/customFieldService'
import './index.less'

const { Title } = Typography

type ConfigurableColumnKey = Exclude<ColumnKey, 'title'>
type ExtraColumnKey =
  | 'subtaskProgress'
  | 'taskSource'
  | 'assigner'
  | 'followers'
  | 'completed'
  | 'updated'
  | 'taskId'
  | 'sourceCategory'
type CustomFieldColumnKey = `custom:${string}`
type ExtendedColumnKey = ColumnKey | ExtraColumnKey | CustomFieldColumnKey
type CustomFieldGroupModeKey = `custom:${string}`
type BaseGroupModeKey = 'section' | 'none' | 'assignee' | 'start' | 'due' | 'creator'
type TaskTableTaskRow = Task & {
  key: string
  rowKind: 'task'
  tableDepth: number
  sectionGuid: string
  children?: TaskTableTaskRow[]
}
type TaskTableSectionRow = {
  key: string
  guid: string
  rowKind: 'section'
  section: Section
  sectionTasks: Task[]
}
type TaskTableInlineCreateRow = {
  key: string
  guid: string
  rowKind: 'inlineCreate'
  section: Section
  content: React.ReactNode
}
type TaskTableNewTaskRow = {
  key: string
  guid: string
  rowKind: 'newTask'
  section: Section
}
type TaskTableDisplayRow =
  | TaskTableTaskRow
  | TaskTableSectionRow
  | TaskTableInlineCreateRow
  | TaskTableNewTaskRow
type ResizableColumnKey = 'title' | ExtendedColumnKey

interface FieldOption {
  key: ExtendedColumnKey
  label: string
  isVisible: boolean
  sortOrder?: number
}

const allConfigurableColumns: ConfigurableColumnKey[] = [
  'priority',
  'assignee',
  'estimate',
  'start',
  'due',
  'creator',
  'created',
]

const DEFAULT_COLUMN_WIDTH = 120
const DEFAULT_CUSTOM_FIELD_COLUMN_WIDTH = DEFAULT_COLUMN_WIDTH
const DEFAULT_COLUMN_WIDTHS: Partial<Record<ResizableColumnKey, number>> = {
  title: 407,
}
const MIN_COLUMN_WIDTH = 42
const MIN_TITLE_COLUMN_WIDTH = 140
const MAX_COLUMN_WIDTH = 720

const QUICK_CREATE_RECOMMENDED_FIELDS: Array<{
  key: string
  label: string
  type: ApiCustomFieldType
  draft?: {
    options?: Array<{ value: string; label: string; color?: string | null }>
  }
}> = [
  {
    key: 'priority',
    label: '优先级',
    type: 'select',
    draft: {
      options: [
        { value: 'urgent', label: '高', color: '#f53f3f' },
        { value: 'medium', label: '中', color: '#ff7d00' },
        { value: 'low', label: '低', color: '#00b42a' },
      ],
    },
  },
  { key: 'price', label: '价格', type: 'number' },
  {
    key: 'risk_level',
    label: '风险级',
    type: 'select',
    draft: {
      options: [
        { value: 'high', label: '高', color: '#f53f3f' },
        { value: 'medium', label: '中', color: '#ff7d00' },
        { value: 'low', label: '低', color: '#00b42a' },
      ],
    },
  },
  { key: 'cost', label: '成本', type: 'number' },
]

const columnLabelMap: Record<ConfigurableColumnKey, string> = {
  priority: '优先级',
  assignee: '负责人',
  estimate: '预估工时',
  start: '开始时间',
  due: '截止时间',
  creator: '创建人',
  created: '创建时间',
}

const extraColumnLabelMap: Record<ExtraColumnKey, string> = {
  subtaskProgress: '子任务进度',
  taskSource: '任务来源',
  assigner: '分配人',
  followers: '关注人',
  completed: '完成时间',
  updated: '更新时间',
  taskId: '任务 ID',
  sourceCategory: '来源类别',
}

const extraFieldColumns: ExtraColumnKey[] = [
  'subtaskProgress',
  'taskSource',
  'assigner',
  'followers',
  'completed',
  'updated',
  'taskId',
  'sourceCategory',
]

const toCustomFieldColumnKey = (guid: string): CustomFieldColumnKey => `custom:${guid}`

type StatusFilterKey = 'all' | 'todo' | 'done'
type SortModeKey = 'custom' | 'due' | 'start' | 'created'
type VisibleSortModeKey = Exclude<SortModeKey, 'custom'>
type GroupModeKey = BaseGroupModeKey | CustomFieldGroupModeKey
type DateFieldKey = 'start' | 'due'
type CalendarViewMode = 'month' | 'year'
type FilterFieldType = 'member' | 'date' | 'text' | 'number' | 'select' | 'multiSelect'
type FilterOperator =
  | 'contains'
  | 'not_contains'
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'before'
  | 'after'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'
type FilterDateMode =
  | 'today'
  | 'thisWeek'
  | 'lastWeek'
  | 'nextWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'nextMonth'
  | 'custom'

interface FilterFieldConfig {
  key: string
  label: string
  type: FilterFieldType
  customField?: CustomFieldDef
  options?: { label: string; value: string; color?: string | null }[]
}

interface FilterOperatorOption {
  key: FilterOperator
  label: string
}

interface FilterCondition {
  id: string
  fieldKey: string
  operator: FilterOperator
  dateMode?: FilterDateMode
  value?: string | string[]
  endValue?: string
}

const INLINE_CREATE_FLOATING_SELECTOR = [
  '.ant-popover',
  '.ant-select-dropdown',
  '.ant-picker-dropdown',
  '.ant-tooltip',
].join(',')

const statusFilterLabelMap: Record<StatusFilterKey, string> = {
  all: '全部任务',
  todo: '未完成',
  done: '已完成',
}

const taskStatusLabelMap: Record<Task['status'], string> = {
  todo: '未开始',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

const sortLabelMap: Record<VisibleSortModeKey, string> = {
  due: '截止时间',
  start: '开始时间',
  created: '创建时间',
}

const visibleSortModes: VisibleSortModeKey[] = ['due', 'start', 'created']

const systemFilterFieldConfigs: FilterFieldConfig[] = [
  { key: 'assignee', label: '负责人', type: 'member' },
  { key: 'start', label: '开始时间', type: 'date' },
  { key: 'due', label: '截止时间', type: 'date' },
  { key: 'completed', label: '完成时间', type: 'date' },
  { key: 'assigner', label: '分配人', type: 'member' },
  { key: 'followers', label: '关注人', type: 'member' },
  { key: 'creator', label: '创建人', type: 'member' },
  { key: 'created', label: '创建时间', type: 'date' },
  { key: 'updated', label: '更新时间', type: 'date' },
  { key: 'priority', label: '优先级', type: 'select' },
  { key: 'taskId', label: '任务 ID', type: 'text' },
]

const containsFilterOperators: FilterOperatorOption[] = [
  { key: 'contains', label: '包含' },
  { key: 'not_contains', label: '不包含' },
  { key: 'is_empty', label: '为空' },
  { key: 'is_not_empty', label: '不为空' },
]

const dateFilterOperators: FilterOperatorOption[] = [
  { key: 'eq', label: '等于' },
  { key: 'before', label: '早于' },
  { key: 'after', label: '晚于' },
  { key: 'between', label: '介于' },
  { key: 'is_empty', label: '为空' },
  { key: 'is_not_empty', label: '不为空' },
]

const numberFilterOperators: FilterOperatorOption[] = [
  { key: 'eq', label: '等于' },
  { key: 'neq', label: '不等于' },
  { key: 'lt', label: '小于' },
  { key: 'lte', label: '小于等于' },
  { key: 'gt', label: '大于' },
  { key: 'gte', label: '大于等于' },
  { key: 'is_empty', label: '为空' },
  { key: 'is_not_empty', label: '不为空' },
]

const dateModeOptions: { key: FilterDateMode; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'thisWeek', label: '本周' },
  { key: 'lastWeek', label: '上周' },
  { key: 'nextWeek', label: '下周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'nextMonth', label: '下月' },
  { key: 'custom', label: '指定日期' },
]

const priorityFilterOptions = [
  { label: '无', value: String(Priority.None) },
  { label: '低', value: String(Priority.Low) },
  { label: '中', value: String(Priority.Medium) },
  { label: '高', value: String(Priority.High) },
  { label: '紧急', value: String(Priority.Urgent) },
]

const baseGroupLabelMap: Record<BaseGroupModeKey, string> = {
  section: '任务分组',
  none: '无分组',
  assignee: '负责人',
  start: '开始时间',
  due: '截止时间',
  creator: '创建人',
}

interface GroupSection extends Section {
  countLabel?: string
}

const startDateGroupDefinitions = [
  { key: 'started', name: '已开始' },
  { key: 'today', name: '今天' },
  { key: 'tomorrow', name: '明天' },
  { key: 'next7', name: '未来 7 天' },
  { key: 'later', name: '以后' },
  { key: 'none', name: '未安排' },
] as const

const dueDateGroupDefinitions = [
  { key: 'overdue', name: '已逾期' },
  { key: 'today', name: '今天' },
  { key: 'tomorrow', name: '明天' },
  { key: 'next7', name: '未来 7 天' },
  { key: 'later', name: '以后' },
  { key: 'none', name: '未安排' },
] as const

function buildCustomFilterFieldConfig(field: CustomFieldDef): FilterFieldConfig {
  if (field.type === 'single_select' || field.type === 'select') {
    return {
      key: field.guid,
      label: field.name,
      type: 'select',
      customField: field,
      options: (field.options ?? []).map((option) => ({
        label: option.name,
        value: option.guid,
        color: option.color,
      })),
    }
  }

  if (field.type === 'multi_select') {
    return {
      key: field.guid,
      label: field.name,
      type: 'multiSelect',
      customField: field,
      options: (field.options ?? []).map((option) => ({
        label: option.name,
        value: option.guid,
        color: option.color,
      })),
    }
  }

  if (field.type === 'member') {
    return { key: field.guid, label: field.name, type: 'member', customField: field }
  }

  if (field.type === 'number') {
    return { key: field.guid, label: field.name, type: 'number', customField: field }
  }

  if (field.type === 'datetime' || field.type === 'date') {
    return { key: field.guid, label: field.name, type: 'date', customField: field }
  }

  return { key: field.guid, label: field.name, type: 'text', customField: field }
}

function getFilterOperatorsByFieldType(type: FilterFieldType): FilterOperatorOption[] {
  if (type === 'date') {
    return dateFilterOperators
  }
  if (type === 'number') {
    return numberFilterOperators
  }
  return containsFilterOperators
}

function createDefaultFilterCondition(field: FilterFieldConfig): FilterCondition {
  const defaultOperator = getFilterOperatorsByFieldType(field.type)[0]?.key ?? 'contains'
  return {
    id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fieldKey: field.key,
    operator: defaultOperator,
    dateMode: field.type === 'date' ? 'custom' : undefined,
    value: undefined,
    endValue: undefined,
  }
}

function isFilterConditionPristine(condition: FilterCondition, field: FilterFieldConfig): boolean {
  const defaultOperator = getFilterOperatorsByFieldType(field.type)[0]?.key ?? 'contains'
  return condition.fieldKey === field.key
    && condition.operator === defaultOperator
    && condition.dateMode === (field.type === 'date' ? 'custom' : undefined)
    && !normalizeFilterTextValue(condition.value)
    && !normalizeFilterTextValue(condition.endValue)
}

function normalizeFilterTextValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }
  return value ?? ''
}

function resolveDateModeRange(mode: FilterDateMode): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const now = dayjs()
  switch (mode) {
    case 'today':
      return { start: now.startOf('day'), end: now.endOf('day') }
    case 'thisWeek':
      return { start: now.startOf('week'), end: now.endOf('week') }
    case 'lastWeek': {
      const lastWeek = now.subtract(1, 'week')
      return { start: lastWeek.startOf('week'), end: lastWeek.endOf('week') }
    }
    case 'nextWeek': {
      const nextWeek = now.add(1, 'week')
      return { start: nextWeek.startOf('week'), end: nextWeek.endOf('week') }
    }
    case 'thisMonth':
      return { start: now.startOf('month'), end: now.endOf('month') }
    case 'lastMonth': {
      const lastMonth = now.subtract(1, 'month')
      return { start: lastMonth.startOf('month'), end: lastMonth.endOf('month') }
    }
    case 'nextMonth': {
      const nextMonth = now.add(1, 'month')
      return { start: nextMonth.startOf('month'), end: nextMonth.endOf('month') }
    }
    default:
      return { start: now.startOf('day'), end: now.endOf('day') }
  }
}

function isFilterConditionValueEmpty(condition: FilterCondition, field: FilterFieldConfig): boolean {
  if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
    return false
  }

  if (field.type === 'date') {
    if (condition.dateMode && condition.dateMode !== 'custom') {
      return false
    }
    if (condition.operator === 'between') {
      return !normalizeFilterTextValue(condition.value) || !normalizeFilterTextValue(condition.endValue)
    }
    return !normalizeFilterTextValue(condition.value)
  }

  return !normalizeFilterTextValue(condition.value)
}

function getTaskMemberLabels(task: Task, role: 'assignee' | 'follower', users: User[]): string[] {
  if (role === 'follower') {
    const followerIds = new Set([
      ...(task.participant_ids ?? []),
      ...task.members.filter((member) => member.role === 'follower').map((member) => member.id),
    ])
    return Array.from(followerIds).map((id) => users.find((user) => user.id === id)?.name ?? id)
  }

  return task.members
    .filter((member) => member.role === role)
    .map((member) => users.find((user) => user.id === member.id)?.name ?? member.name ?? member.id)
}

function getTaskDateValue(task: Task, fieldKey: string): dayjs.Dayjs | null {
  switch (fieldKey) {
    case 'start':
      return task.start?.timestamp ? dayjs(Number(task.start.timestamp)) : null
    case 'due':
      return task.due?.timestamp ? dayjs(Number(task.due.timestamp)) : null
    case 'completed':
      return task.completed_at && task.completed_at !== '0' ? dayjs(Number(task.completed_at)) : null
    case 'created':
      return task.created_at ? dayjs(Number(task.created_at)) : null
    case 'updated':
      return task.updated_at ? dayjs(Number(task.updated_at)) : null
    default:
      return null
  }
}

function getTaskCustomFieldValue(task: Task, field: CustomFieldDef, users: User[]): string[] {
  const fieldValue = task.custom_fields.find((item) => item.guid === field.guid)
  if (!fieldValue) {
    return []
  }

  switch (field.type) {
    case 'single_select':
    case 'select':
      return fieldValue.single_select_value ? [fieldValue.single_select_value] : []
    case 'multi_select':
      return fieldValue.multi_select_value ?? []
    case 'member':
      return fieldValue.member_value?.map((member) => member.name ?? users.find((user) => user.id === member.id)?.name ?? member.id) ?? []
    case 'number':
      return fieldValue.number_value ? [fieldValue.number_value] : []
    case 'datetime':
    case 'date':
      return fieldValue.datetime_value ? [fieldValue.datetime_value] : []
    case 'text':
      return fieldValue.text_value ? [fieldValue.text_value] : []
    default:
      return []
  }
}

function getTaskFilterValues(
  task: Task,
  field: FilterFieldConfig,
  users: User[],
): { values: string[]; dateValue: dayjs.Dayjs | null } {
  if (field.customField) {
    if (field.type === 'date') {
      const rawValue = getTaskCustomFieldValue(task, field.customField, users)[0]
      return {
        values: rawValue ? [rawValue] : [],
        dateValue: rawValue ? dayjs(Number(rawValue)) : null,
      }
    }
    return {
      values: getTaskCustomFieldValue(task, field.customField, users),
      dateValue: null,
    }
  }

  switch (field.key) {
    case 'assignee':
      return { values: getTaskMemberLabels(task, 'assignee', users), dateValue: null }
    case 'assigner':
    case 'creator':
      return { values: [users.find((user) => user.id === task.creator.id)?.name ?? task.creator.id], dateValue: null }
    case 'followers':
      return { values: getTaskMemberLabels(task, 'follower', users), dateValue: null }
    case 'priority':
      return { values: [String(task.priority)], dateValue: null }
    case 'taskId':
      return { values: [task.task_id], dateValue: null }
    case 'start':
    case 'due':
    case 'completed':
    case 'created':
    case 'updated':
      return { values: [], dateValue: getTaskDateValue(task, field.key) }
    default:
      return { values: [], dateValue: null }
  }
}

function matchContainsOperator(values: string[], condition: FilterCondition): boolean {
  if (condition.operator === 'is_empty') {
    return values.length === 0 || values.every((value) => !value)
  }
  if (condition.operator === 'is_not_empty') {
    return values.some(Boolean)
  }

  const targetValue = normalizeFilterTextValue(condition.value)
  if (!targetValue) {
    return true
  }

  if (condition.operator === 'contains') {
    return values.includes(targetValue)
  }
  if (condition.operator === 'not_contains') {
    return !values.includes(targetValue)
  }
  return true
}

function matchNumberOperator(values: string[], condition: FilterCondition): boolean {
  if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
    return matchContainsOperator(values, condition)
  }

  const rawValue = values[0]
  const left = rawValue ? Number(rawValue) : NaN
  const right = Number(normalizeFilterTextValue(condition.value))
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false
  }

  switch (condition.operator) {
    case 'eq':
      return left === right
    case 'neq':
      return left !== right
    case 'lt':
      return left < right
    case 'lte':
      return left <= right
    case 'gt':
      return left > right
    case 'gte':
      return left >= right
    default:
      return true
  }
}

function matchDateOperator(dateValue: dayjs.Dayjs | null, condition: FilterCondition): boolean {
  if (condition.operator === 'is_empty') {
    return !dateValue
  }
  if (condition.operator === 'is_not_empty') {
    return Boolean(dateValue)
  }
  if (!dateValue) {
    return false
  }

  if (condition.dateMode && condition.dateMode !== 'custom') {
    const range = resolveDateModeRange(condition.dateMode)
    return dateValue.isSame(range.start, 'day') || dateValue.isSame(range.end, 'day') || (dateValue.isAfter(range.start) && dateValue.isBefore(range.end))
  }

  const left = dateValue.startOf('day')
  const rightRaw = normalizeFilterTextValue(condition.value)
  const right = rightRaw ? dayjs(Number(rightRaw)).startOf('day') : null
  if (!right) {
    return false
  }

  switch (condition.operator) {
    case 'eq':
      return left.isSame(right, 'day')
    case 'before':
      return left.isBefore(right, 'day')
    case 'after':
      return left.isAfter(right, 'day')
    case 'between': {
      const endRaw = normalizeFilterTextValue(condition.endValue)
      const end = endRaw ? dayjs(Number(endRaw)).startOf('day') : null
      if (!end) {
        return false
      }
      const rangeStart = right.isBefore(end) ? right : end
      const rangeEnd = right.isBefore(end) ? end : right
      return left.isSame(rangeStart, 'day') || left.isSame(rangeEnd, 'day') || (left.isAfter(rangeStart) && left.isBefore(rangeEnd))
    }
    default:
      return true
  }
}

function matchTaskFilterCondition(
  task: Task,
  condition: FilterCondition,
  filterFieldConfigMap: Map<string, FilterFieldConfig>,
  users: User[],
): boolean {
  const field = filterFieldConfigMap.get(condition.fieldKey)
  if (!field) {
    return true
  }
  if (isFilterConditionValueEmpty(condition, field)) {
    return true
  }

  const { values, dateValue } = getTaskFilterValues(task, field, users)
  if (field.type === 'date') {
    return matchDateOperator(dateValue, condition)
  }
  if (field.type === 'number') {
    return matchNumberOperator(values, condition)
  }
  return matchContainsOperator(values, condition)
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

interface TaskTableProps {
  config: ViewConfig
  tasks: Task[]
  sections?: Section[]
  tasklist?: Tasklist
  selectedTaskGuid?: string
  statusFilter?: StatusFilterKey
  sortMode?: SortModeKey
  mineOnly?: boolean
  pendingExpandTaskGuid?: string | null
  onStatusFilterChange?: (v: StatusFilterKey) => void
  onSortModeChange?: (v: SortModeKey) => void
  onMineOnlyChange?: (v: boolean) => void
  onPendingExpandConsumed?: (taskGuid: string) => void
  onTaskClick: (task: Task) => void
  onRefresh: () => void
  onTaskCreated?: (task: Task, section?: Section) => void
  onTaskUpdated?: (task: Task) => void
  onTasklistUpdated?: (tasklist: Tasklist) => void
  onTaskCreatedDetailOpen?: (task: Task) => void
  onTaskDeleted?: (taskGuid: string) => void
}

interface DateConfigPanelProps {
  initialField: DateFieldKey
  startDate: dayjs.Dayjs | null
  dueDate: dayjs.Dayjs | null
  onStartChange: (value: dayjs.Dayjs | null) => void
  onDueChange: (value: dayjs.Dayjs | null) => void
  onInteract?: () => void
}

interface AssigneePickerProps {
  pickerKey: string
  open: boolean
  value?: string[]
  users: User[]
  taskMembers?: Member[]
  placeholderIcon: React.ReactNode
  isTasklistView: boolean
  triggerClassName?: string
  onChange: (value: string[]) => void
  onInteract?: () => void
  onOpenChange?: (open: boolean) => void
}

function AssigneePicker({
  open,
  value,
  users,
  taskMembers,
  placeholderIcon,
  isTasklistView,
  triggerClassName,
  onChange,
  onInteract,
  onOpenChange,
}: AssigneePickerProps) {
  const popupContainerRef = useRef<HTMLDivElement | null>(null)
  const [selectOpen, setSelectOpen] = useState(open)
  const membersById = useMemo(
    () =>
      new Map(
        (taskMembers ?? []).map((member) => [
          member.id,
          {
            id: member.id,
            name: member.name ?? member.id,
            avatar: member.avatar,
          },
        ]),
      ),
    [taskMembers],
  )
  const selectedUsers = (value ?? [])
    .map((id) => {
      const matchedMember = membersById.get(id)
      const matchedUser = users.find((user) => user.id === id)
      return matchedMember ?? matchedUser ?? { id, name: id }
    })

  const handlePopoverOpenChange = (open: boolean) => {
    setSelectOpen(open)
    onOpenChange?.(open)
  }

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      open={open}
      destroyOnHidden
      onOpenChange={handlePopoverOpenChange}
      content={
        <div
          ref={popupContainerRef}
          style={{ width: 220 }}
          onMouseDown={onInteract}
        >
          <UserSearchSelect
            label="添加负责人"
            size="small"
            mode="multiple"
            open={open ? selectOpen : false}
            onOpenChange={setSelectOpen}
            getPopupContainer={() => popupContainerRef.current ?? document.body}
            style={{ width: '100%' }}
            placeholder="搜索用户"
            value={value}
            onChange={(nextValue) => onChange(Array.isArray(nextValue) ? nextValue : [])}
            users={users}
            autoFocus
          />
        </div>
      }
    >
      <div
        className={triggerClassName ? `assignee-cell ${triggerClassName}` : 'assignee-cell'}
        onMouseDown={onInteract}
      >
        {selectedUsers.length > 0 ? (
          isTasklistView ? (
            <Avatar.Group size={20} max={{ count: 3 }}>
              {selectedUsers.map((selectedUser) => (
                <Tooltip
                  key={selectedUser.id}
                  title={selectedUser.name ?? selectedUser.id}
                >
                  <Avatar
                    size={20}
                    className="tasklist-assignee-avatar"
                    style={{ backgroundColor: '#7b67ee', color: '#fff', fontSize: 11 }}
                  >
                    {(selectedUser.name ?? selectedUser.id).slice(0, 1)}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          ) : (
            <Avatar.Group size={24} max={{ count: 3 }}>
              {selectedUsers.map((selectedUser) => (
                <Tooltip
                  key={selectedUser.id}
                  title={selectedUser.name ?? selectedUser.id}
                >
                  <Avatar
                    size={24}
                    style={{ backgroundColor: '#7b67ee', fontSize: 12 }}
                  >
                    {(selectedUser.name ?? selectedUser.id).slice(0, 1)}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          )
        ) : (
          placeholderIcon
        )}
      </div>
    </Popover>
  )
}

function isInlineCreateRow(record: TaskTableDisplayRow): record is TaskTableInlineCreateRow {
  return record.rowKind === 'inlineCreate'
}

function DateConfigPanel({
  initialField,
  startDate,
  dueDate,
  onStartChange,
  onDueChange,
  onInteract,
}: DateConfigPanelProps) {
  const defaultCalendarValue =
    (initialField === 'start' ? startDate : dueDate) ?? startDate ?? dueDate ?? dayjs()
  const [activeField, setActiveField] = useState<DateFieldKey>(initialField)
  const [calendarValue, setCalendarValue] = useState<dayjs.Dayjs>(defaultCalendarValue)
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('month')

  const focusField = (field: DateFieldKey) => {
    setActiveField(field)
    setCalendarMode('month')
    setCalendarValue((field === 'start' ? startDate : dueDate) ?? startDate ?? dueDate ?? dayjs())
  }

  const handleSelect = (
    value: dayjs.Dayjs,
    selectInfo: { source: 'year' | 'month' | 'date' | 'customize' },
  ) => {
    // 月份面板只负责切换浏览月份，不直接改开始/截止日期。
    if (selectInfo.source === 'month') {
      setCalendarValue(value.startOf('month'))
      setCalendarMode('month')
      return
    }

    const nextValue = value.startOf('day')
    setCalendarValue(nextValue)
    if (activeField === 'start') {
      onStartChange(nextValue)
      return
    }
    onDueChange(nextValue)
  }

  const handleClearAll = () => {
    onStartChange(null)
    onDueChange(null)
    setCalendarMode('month')
    setCalendarValue(dayjs())
  }

  return (
    <div className="date-config-panel" onMouseDown={onInteract}>
      <Calendar
        fullscreen={false}
        value={calendarValue}
        mode={calendarMode}
        onSelect={handleSelect}
        onPanelChange={(value, mode) => {
          setCalendarValue(value)
          setCalendarMode(mode)
        }}
        headerRender={({ value, type, onTypeChange }) => (
          <div className="date-config-header">
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined />}
              onClick={() => setCalendarValue(
                value.clone().subtract(1, type === 'year' ? 'year' : 'month'),
              )}
            />
            <Button
              type="text"
              size="small"
              className="date-config-month-btn"
              icon={type === 'year' ? <UpOutlined /> : <DownOutlined />}
              iconPlacement="end"
              onClick={() => onTypeChange(type === 'month' ? 'year' : 'month')}
            >
              {value.format('YYYY年 M月')}
            </Button>
            <Button
              type="text"
              size="small"
              icon={<RightOutlined />}
              onClick={() => setCalendarValue(
                value.clone().add(1, type === 'year' ? 'year' : 'month'),
              )}
            />
          </div>
        )}
      />

      <Space vertical size={8} className="date-config-inputs">
        <Input
          readOnly
          value={startDate ? startDate.format('YYYY/MM/DD') : ''}
          placeholder="开始日期"
          className={activeField === 'start' ? 'date-config-input active' : 'date-config-input'}
          onClick={() => focusField('start')}
        />
        <Input
          readOnly
          value={dueDate ? dueDate.format('YYYY/MM/DD') : ''}
          placeholder="截止日期"
          className={activeField === 'due' ? 'date-config-input active' : 'date-config-input'}
          onClick={() => focusField('due')}
        />
      </Space>

      <Checkbox className="date-config-checkbox">具体时间</Checkbox>

      <Divider className="date-config-divider" />

      <Button type="text" icon={<ClockCircleOutlined />} className="date-config-link-btn">
        到期提醒
      </Button>

      <div className="date-config-footer">
        <Button
          type="text"
          icon={<ReloadOutlined />}
          className="date-config-clear-btn"
          onClick={handleClearAll}
        >
          全部清除
        </Button>
      </div>
    </div>
  )
}

function isInlineCreateFloatingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INLINE_CREATE_FLOATING_SELECTOR))
}

type ResizableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  columnKey?: ResizableColumnKey
  width?: number
  minWidth?: number
  onResize?: (columnKey: ResizableColumnKey, width: number) => void
}

function ResizableHeaderCell({
  columnKey,
  width,
  minWidth = MIN_COLUMN_WIDTH,
  onResize,
  children,
  className,
  ...restProps
}: ResizableHeaderCellProps) {
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (!columnKey || !width || !onResize) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    startXRef.current = event.clientX
    startWidthRef.current = width

    // 拖拽过程中监听 window，避免鼠标移出表头后列宽停止更新。
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(minWidth, startWidthRef.current + moveEvent.clientX - startXRef.current),
      )
      onResize(columnKey, nextWidth)
    }

    const handleMouseUp = () => {
      document.body.classList.remove('task-column-resizing')
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    document.body.classList.add('task-column-resizing')
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <th
      {...restProps}
      className={[className, columnKey ? 'task-resizable-column-header' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="task-column-header-content">{children}</span>
      {columnKey && onResize ? (
        <span
          className="task-column-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖拽调整字段宽度"
          onMouseDown={handleMouseDown}
        />
      ) : null}
    </th>
  )
}

export default function TaskTable({
  config,
  tasks,
  sections,
  tasklist,
  selectedTaskGuid,
  statusFilter: controlledStatusFilter,
  sortMode: controlledSortMode,
  mineOnly: _controlledMineOnly,
  pendingExpandTaskGuid,
  onStatusFilterChange,
  onSortModeChange,
  onMineOnlyChange: _onMineOnlyChange,
  onPendingExpandConsumed,
  onTaskClick,
  onRefresh,
  onTaskCreated,
  onTaskUpdated,
  onTasklistUpdated,
  onTaskCreatedDetailOpen,
}: TaskTableProps) {
  const { token } = theme.useToken()
  const currentUser: User = { id: appConfig.user_id, name: appConfig.user_id }
  const [users, setUsers] = useState<User[]>([])
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    return new Set(
      (sections ?? [])
        .filter((section) => section.defaultCollapsed)
        .map((section) => section.guid),
    )
  })
  const [creatingInSection, setCreatingInSection] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssigneeIds, setNewTaskAssigneeIds] = useState<string[]>([])
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.None)
  const [newTaskStart, setNewTaskStart] = useState<dayjs.Dayjs | null>(null)
  const [newTaskDue, setNewTaskDue] = useState<dayjs.Dayjs | null>(null)
  const [submittingSectionGuid, setSubmittingSectionGuid] = useState<string | null>(null)
  const [animatedTaskGuid, setAnimatedTaskGuid] = useState<string | null>(null)
  const [animatedSectionGuid, setAnimatedSectionGuid] = useState<string | null>(null)
  const [parentPickerTask, setParentPickerTask] = useState<Task | null>(null)
  const [parentPickerSubmitting, setParentPickerSubmitting] = useState(false)
  const inlineCreateRowRef = useRef<HTMLDivElement | null>(null)
  const inlineCreateSubmittingRef = useRef<string | null>(null)
  const [inlineCreateFocusedField, setInlineCreateFocusedField] = useState<
    'title' | 'assignee' | 'priority' | 'start' | 'due' | null
  >(null)
  const [internalStatusFilter, setInternalStatusFilter] = useState<StatusFilterKey>(
    config.toolbar.statusFilterLabel === '未完成' ? 'todo' : 'all',
  )
  const [internalSortMode, setInternalSortMode] = useState<SortModeKey>(() => {
    if (config.toolbar.sortLabel === '开始时间') {
      return 'start'
    }
    if (config.toolbar.sortLabel === '创建时间' || config.toolbar.sortLabel === '完成时间') {
      return 'created'
    }
    return 'due'
  })
  const statusFilter = controlledStatusFilter ?? internalStatusFilter
  const effectiveSortMode = controlledSortMode ?? internalSortMode
  const sortMode: VisibleSortModeKey = effectiveSortMode === 'custom' ? 'due' : effectiveSortMode
  const setStatusFilter = (v: StatusFilterKey) => {
    setInternalStatusFilter(v)
    onStatusFilterChange?.(v)
  }
  const setSortMode = (v: SortModeKey) => {
    setInternalSortMode(v)
    onSortModeChange?.(v)
  }
  const [groupMode, setGroupMode] = useState<GroupModeKey>(
    config.groupBySection ? 'section' : 'none',
  )
  const [visibleSectionGuids, setVisibleSectionGuids] = useState<Set<string>>(new Set())
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<ExtendedColumnKey[]>(config.columns)
  const [columnWidths, setColumnWidths] = useState<Partial<Record<ResizableColumnKey, number>>>({})
  const [localSections, setLocalSections] = useState<Section[]>(sections ?? [])
  const [hasLocalSectionEdits, setHasLocalSectionEdits] = useState(false)
  const [creatingSection, setCreatingSection] = useState(false)
  const [activeAssigneePickerKey, setActiveAssigneePickerKey] = useState<string | null>(null)
  const [expandedTaskGuids, setExpandedTaskGuids] = useState<Set<string>>(new Set())
  const [subtasksByGuid, setSubtasksByGuid] = useState<Record<string, Task[]>>({})

  // 外部 tasks 是权威数据源：详情页增删子任务后，要同步已展开父任务的子任务缓存。
  useEffect(() => {
    queueMicrotask(() => {
      setSubtasksByGuid((prev) => {
        let changed = false
        const taskByGuid = new Map(tasks.map((item) => [item.guid, item]))
        const childrenByParent = new Map<string, Task[]>()
        for (const item of tasks) {
          if (!item.parent_task_guid) continue
          const parent = taskByGuid.get(item.parent_task_guid)
          const child = parent
            ? inheritParentStartForTasks([item], parent)[0]
            : item
          const children = childrenByParent.get(item.parent_task_guid) ?? []
          children.push(child)
          childrenByParent.set(item.parent_task_guid, children)
        }

        const next: Record<string, Task[]> = {}
        for (const [pid, list] of Object.entries(prev)) {
          const parent = taskByGuid.get(pid)
          const cachedChildren = list.flatMap((child) => {
            const fresh = taskByGuid.get(child.guid)
            if (!fresh) {
              changed = true
              return []
            }
            if (fresh !== child) {
              changed = true
              return [parent ? inheritParentStartForTasks([fresh], parent)[0] : fresh]
            }
            return [parent ? inheritParentStartForTasks([child], parent)[0] : child]
          })
          const cachedGuidSet = new Set(cachedChildren.map((child) => child.guid))
          const externalChildren = childrenByParent.get(pid) ?? []
          const merged = [...cachedChildren]
          for (const child of externalChildren) {
            if (cachedGuidSet.has(child.guid)) {
              continue
            }
            changed = true
            merged.push(child)
          }

          next[pid] = merged
        }
        return changed ? next : prev
      })
    })
  }, [tasks])

  const handleToggleExpand = useCallback(async (parent: Task) => {
    const guid = parent.guid
    setExpandedTaskGuids((prev) => {
      const next = new Set(prev)
      if (next.has(guid)) next.delete(guid)
      else next.add(guid)
      return next
    })
    if (!subtasksByGuid[guid]) {
      try {
        const items = await listSubtasks(guid)
        setSubtasksByGuid((prev) => ({
          ...prev,
          [guid]: inheritParentStartForTasks(items.map((t) => apiTaskToTask(t)), parent),
        }))
      } catch {
        setSubtasksByGuid((prev) => ({ ...prev, [guid]: [] }))
      }
    }
  }, [subtasksByGuid])

  useEffect(() => {
    if (!pendingExpandTaskGuid) {
      return
    }

    queueMicrotask(() => {
      setExpandedTaskGuids((prev) => {
        if (prev.has(pendingExpandTaskGuid)) {
          return prev
        }
        const next = new Set(prev)
        next.add(pendingExpandTaskGuid)
        return next
      })
    })

    if (!subtasksByGuid[pendingExpandTaskGuid]) {
      const parentTask = tasks.find((task) => task.guid === pendingExpandTaskGuid)
      if (!parentTask) {
        onPendingExpandConsumed?.(pendingExpandTaskGuid)
        return
      }
      void listSubtasks(pendingExpandTaskGuid)
        .then((items) => {
          setSubtasksByGuid((prev) => ({
            ...prev,
            [pendingExpandTaskGuid]: inheritParentStartForTasks(items.map((t) => apiTaskToTask(t)), parentTask),
          }))
        })
        .catch(() => {
          setSubtasksByGuid((prev) => ({ ...prev, [pendingExpandTaskGuid]: [] }))
        })
    }

    onPendingExpandConsumed?.(pendingExpandTaskGuid)
  }, [onPendingExpandConsumed, pendingExpandTaskGuid, subtasksByGuid])
  const [creatingCustomField, setCreatingCustomField] = useState(false)
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorInitialType, setEditorInitialType] = useState<ApiCustomFieldType>('text')
  const [editorInitialTab, setEditorInitialTab] = useState<'new' | 'existing'>('new')
  const [editorInitialDraft, setEditorInitialDraft] = useState<{
    name?: string
    required?: boolean
    options?: Array<{ value: string; label: string; color?: string | null }>
  } | null>(null)
  const [editorField, setEditorField] = useState<ApiCustomField | null>(null)
  const [rawCustomFields, setRawCustomFields] = useState<ApiCustomField[]>([])
  void creatingCustomField
  void setCreatingCustomField

  const apiToCustomFieldDef = (f: ApiCustomField): CustomFieldDef => ({
    guid: f.field_id,
    name: f.name,
    type:
      f.field_type === 'select'
        ? 'single_select'
        : f.field_type === 'date'
        ? 'datetime'
        : (f.field_type as CustomFieldDef['type']),
    options: (f.options ?? []).map((o) => ({
      guid: o.value,
      name: o.label,
      color: o.color,
      is_disabled: o.is_disabled,
      disabled_at: o.disabled_at,
    })),
  })

  const buildVisibleColumnKeys = useCallback(
    (fields: ApiCustomField[]) => {
      const nextKeys = new Set<ExtendedColumnKey>(config.columns)
      fields
        .filter((field) => field.is_visible !== false)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach((field) => nextKeys.add(toCustomFieldColumnKey(field.field_id)))
      return Array.from(nextKeys)
    },
    [config.columns],
  )

  // 加载项目自定义字段
  useEffect(() => {
    if (!tasklist) return
    let cancelled = false
    void listCustomFields(tasklist.guid, { includeDisabledOptions: true })
      .then((list) => {
        if (cancelled) return
        setRawCustomFields(list)
        setVisibleColumnKeys((prev) => {
          const persistedKeys = buildVisibleColumnKeys(list)
          const extraVisibleKeys = prev.filter(
            (key) => typeof key === 'string' && !key.startsWith('custom:'),
          )
          return Array.from(new Set([...persistedKeys, ...extraVisibleKeys]))
        })
        const defs = [...list]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(apiToCustomFieldDef)
        const prev = tasklist.custom_fields ?? []
        const changed =
          prev.length !== defs.length ||
          prev.some((p, i) => p.guid !== defs[i]?.guid || p.name !== defs[i]?.name)
        if (changed) {
          onTasklistUpdated?.({ ...tasklist, custom_fields: defs })
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasklist?.guid])

  const reloadCustomFields = async () => {
    if (!tasklist) return
    try {
      const list = await listCustomFields(tasklist.guid, { includeDisabledOptions: true })
      setRawCustomFields(list)
      setVisibleColumnKeys((prev) => {
        const persistedKeys = buildVisibleColumnKeys(list)
        const extraVisibleKeys = prev.filter(
          (key) => typeof key === 'string' && !key.startsWith('custom:'),
        )
        return Array.from(new Set([...persistedKeys, ...extraVisibleKeys]))
      })
      onTasklistUpdated?.({
        ...tasklist,
        custom_fields: [...list]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(apiToCustomFieldDef),
      })
    } catch {
      // ignore
    }
  }

  const animationTimerRef = useRef<number | null>(null)
  const inlineCreateInteractingRef = useRef(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const filterFieldConfigs = useMemo(() => [
    ...systemFilterFieldConfigs.map((field) =>
      field.key === 'priority'
        ? { ...field, options: priorityFilterOptions }
        : field,
    ),
    ...(tasklist?.custom_fields ?? []).map((field) => buildCustomFilterFieldConfig(field)),
  ], [tasklist?.custom_fields])
  const filterFieldConfigMap = useMemo(
    () => new Map(filterFieldConfigs.map((field) => [field.key, field])),
    [filterFieldConfigs],
  )
  const defaultFilterField = filterFieldConfigs[0] ?? systemFilterFieldConfigs[0]
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(() => [
    createDefaultFilterCondition(systemFilterFieldConfigs[0]),
  ])

  useEffect(() => {
    listMembers()
      .then((members) =>
        setUsers(
          members.map((m) => ({
            id: m.user_id,
            name: m.user_name ?? m.user_id,
            avatar: m.avatar_url ?? undefined,
          })),
        ),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    setFilterConditions((prev) => {
      const next = prev
        .filter((condition) => filterFieldConfigMap.has(condition.fieldKey))
        .map((condition) => {
          const field = filterFieldConfigMap.get(condition.fieldKey)
          if (!field) {
            return condition
          }
          const operators = getFilterOperatorsByFieldType(field.type)
          const operatorExists = operators.some((item) => item.key === condition.operator)
          if (operatorExists) {
            return condition
          }
          return {
            ...condition,
            operator: operators[0]?.key ?? condition.operator,
            dateMode: field.type === 'date' ? (condition.dateMode ?? 'custom') : undefined,
            value: undefined,
            endValue: undefined,
          }
        })

      if (next.length > 0) {
        return next
      }

      return [createDefaultFilterCondition(filterFieldConfigs[0] ?? systemFilterFieldConfigs[0])]
    })
  }, [filterFieldConfigMap, filterFieldConfigs])

  const sectionSource = hasLocalSectionEdits ? localSections : (sections ?? [])

  useEffect(() => {
    setVisibleSectionGuids((prev) => {
      const nextSectionGuids = sectionSource.map((section) => section.guid)
      if (nextSectionGuids.length === 0) {
        return prev.size === 0 ? prev : new Set()
      }

      const hasVisibleMatch = nextSectionGuids.some((guid) => prev.has(guid))
      const nextVisibleGuids = hasVisibleMatch
        ? nextSectionGuids.filter((guid) => prev.has(guid))
        : nextSectionGuids

      if (
        prev.size === nextVisibleGuids.length &&
        nextVisibleGuids.every((guid) => prev.has(guid))
      ) {
        return prev
      }

      return new Set(nextVisibleGuids)
    })
  }, [sectionSource])

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current)
      }
    }
  }, [])

  const startInlineCreate = useCallback((sectionGuid: string) => {
    setCollapsedSections((prev) => {
      if (!prev.has(sectionGuid)) {
        return prev
      }
      const next = new Set(prev)
      next.delete(sectionGuid)
      return next
    })
    setNewTaskAssigneeIds([currentUser.id])
    setNewTaskPriority(Priority.None)
    setNewTaskStart(null)
    setNewTaskDue(null)
    setInlineCreateFocusedField('title')
    setCreatingInSection(sectionGuid)
  }, [currentUser.id])

  const toggleSection = useCallback((sectionGuid: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionGuid)) next.delete(sectionGuid)
      else next.add(sectionGuid)
      return next
    })
  }, [])

  const resetInlineCreate = () => {
    setCreatingInSection(null)
    setNewTaskTitle('')
    setNewTaskAssigneeIds([])
    setNewTaskPriority(Priority.None)
    setNewTaskStart(null)
    setNewTaskDue(null)
    setInlineCreateFocusedField(null)
    setActiveAssigneePickerKey(null)
  }

  const handleInlineCreate = useCallback(async (sectionGuid?: string) => {
    const submittingKey = sectionGuid ?? '__default__'
    if (inlineCreateSubmittingRef.current === submittingKey || submittingSectionGuid === sectionGuid) {
      return
    }
    const summary = newTaskTitle.trim()
    if (!summary) {
      resetInlineCreate()
      return
    }
    inlineCreateSubmittingRef.current = submittingKey
    setSubmittingSectionGuid(sectionGuid ?? null)
    try {
      const assigneeIds = Array.from(
        new Set((newTaskAssigneeIds.length > 0 ? newTaskAssigneeIds : [currentUser.id]).filter(Boolean)),
      )
      const apiTask = await createTaskApi({
        project_id: tasklist!.guid,
        title: summary,
        assignee_ids: assigneeIds,
        priority: toPriorityString(newTaskPriority),
        section_id: sectionGuid,
        start_date: newTaskStart ? newTaskStart.toISOString() : undefined,
        due_date: newTaskDue ? newTaskDue.toISOString() : undefined,
      })
      const defaultParticipantIds = buildDefaultParticipantIds(currentUser.id, assigneeIds)
      if (defaultParticipantIds.length > 0) {
        await addParticipants(apiTask.task_id, defaultParticipantIds)
      }
      let createdTask = apiTaskToTask(apiTask, tasklist?.guid)
      createdTask = applyParticipantIdsToTask(createdTask, [
        ...(createdTask.participant_ids ?? []),
        ...defaultParticipantIds,
      ])
      const targetSection = sections?.find((section) => section.guid === sectionGuid)
      if (sectionGuid) {
        setCollapsedSections((prev) => {
          if (!prev.has(sectionGuid)) {
            return prev
          }
          const next = new Set(prev)
          next.delete(sectionGuid)
          return next
        })
      }
      setNewTaskTitle('')
      resetInlineCreate()
      setAnimatedTaskGuid(createdTask.guid)
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current)
      }
      animationTimerRef.current = window.setTimeout(() => {
        setAnimatedTaskGuid((prev) => (prev === createdTask.guid ? null : prev))
      }, 900)
      onTaskCreated?.(createdTask, targetSection)
      if (!onTaskCreated) {
        onRefresh()
      }
      message.success({
        content: (
          <Space size={8}>
            <span>创建成功</span>
            <Button
              type="link"
              size="small"
              onClick={() => onTaskCreatedDetailOpen?.(createdTask)}
            >
              查看详情
            </Button>
          </Space>
        ),
        duration: 3,
      })
    } finally {
      inlineCreateSubmittingRef.current = null
      setSubmittingSectionGuid(null)
    }
  }, [
    currentUser.id,
    newTaskTitle,
    submittingSectionGuid,
    newTaskAssigneeIds,
    newTaskPriority,
    newTaskStart,
    newTaskDue,
    tasklist,
    sections,
    onTaskCreated,
    onRefresh,
    onTaskCreatedDetailOpen,
  ])

  const handleInlineCreateSubmit = useCallback((sectionGuid?: string) => {
    void handleInlineCreate(sectionGuid)
  }, [handleInlineCreate])

  useEffect(() => {
    if (!creatingInSection) {
      inlineCreateRowRef.current = null
      return undefined
    }

    queueMicrotask(() => {
      inlineCreateRowRef.current = document.querySelector(
        '.task-grid-table .inline-create-table-row',
      ) as HTMLDivElement | null
    })

    return undefined
  }, [creatingInSection, visibleColumnKeys])

  useEffect(() => {
    if (!creatingInSection) {
      return undefined
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target
      const row = inlineCreateRowRef.current
      if (!row || !(target instanceof Node)) {
        return
      }
      if (row.contains(target) || isInlineCreateFloatingTarget(target)) {
        return
      }

      // 行内新建任务要支持“点空白保存”，但点负责人、日期等浮层不能误提交。
      handleInlineCreateSubmit(creatingInSection)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }, [creatingInSection, handleInlineCreateSubmit])

  const markInlineCreateInteracting = () => {
    inlineCreateInteractingRef.current = true
  }

  const handleToggleStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    const optimistic = { ...task, status: nextStatus as Task['status'] }
    handleTaskUpdate(optimistic)
    updateSubtaskInCache(optimistic)
    try {
      const apiTask = await patchTaskStatus(task.guid, nextStatus)
      const next = apiTaskToTask(apiTask, tasklist?.guid)
      handleTaskUpdate(next)
      updateSubtaskInCache(next)
    } catch (err) {
      handleTaskUpdate(task)
      updateSubtaskInCache(task)
      message.error(getActionErrorMessage(err, '更新状态失败'))
    }
  }

  const updateSubtaskInCache = (nextTask: Task) => {
    const parentGuid = nextTask.parent_task_guid
    if (!parentGuid) return
    setSubtasksByGuid((prev) => {
      const list = prev[parentGuid]
      if (!list) return prev
      return {
        ...prev,
        [parentGuid]: list.map((t) => (t.guid === nextTask.guid ? nextTask : t)),
      }
    })
  }

  const handleTaskUpdate = useCallback((nextTask: Task) => {
    updateSubtaskInCache(nextTask)
    onTaskUpdated?.(nextTask)
    if (!onTaskUpdated) {
      onRefresh()
    }
  }, [onRefresh, onTaskUpdated])

  const activeFilterConditions = filterConditions.filter((condition) => {
    const field = filterFieldConfigMap.get(condition.fieldKey)
    if (!field) {
      return false
    }
    return !isFilterConditionValueEmpty(condition, field)
  })

  const tasksAfterFilter = tasks.filter((task) => {
    // 过滤掉有父任务的子任务，子任务通过父行展开显示
    if (task.parent_task_guid) {
      return false
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false
    }

    return activeFilterConditions.every((condition) => matchTaskFilterCondition(task, condition, filterFieldConfigMap, users))
  })

  const tasksAfterSort = [...tasksAfterFilter].sort((left, right) => {
    if (sortMode === 'created') {
      return Number(right.created_at) - Number(left.created_at)
    }

    const field = sortMode === 'due' ? 'due' : 'start'
    const leftValue = left[field]?.timestamp
    const rightValue = right[field]?.timestamp

    if (!leftValue && !rightValue) {
      return 0
    }
    if (!leftValue) {
      return 1
    }
    if (!rightValue) {
      return -1
    }
    return Number(leftValue) - Number(rightValue)
  })

  const isSectionGroupMode = groupMode === 'section'
  const sortedSections = [...sectionSource].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )
  const filteredSections = isSectionGroupMode
    ? sortedSections.filter((section) => visibleSectionGuids.has(section.guid))
    : sortedSections
  const groupableCustomFields = (tasklist?.custom_fields ?? []).filter(
    (field) => field.type === 'single_select' || field.type === 'multi_select',
  )
  const groupModeOptions: { key: GroupModeKey; label: string }[] = [
    ...Object.entries(baseGroupLabelMap).map(([key, label]) => ({
      key: key as BaseGroupModeKey,
      label,
    })),
    ...groupableCustomFields.map((field) => ({
      key: `custom:${field.guid}` as CustomFieldGroupModeKey,
      label: field.name,
    })),
  ]
  const groupLabelMap: Record<string, string> = Object.fromEntries(
    groupModeOptions.map((item) => [item.key, item.label]),
  )

  function buildGroupedTasksByMode() {
    if (isSectionGroupMode) {
      return filteredSections.length > 0
        ? filteredSections.map((section) => ({
            section,
            tasks: tasksAfterSort.filter((t) =>
              t.tasklists.some(
                (ref) =>
                  ref.section_guid === section.guid &&
                  (!tasklist || ref.tasklist_guid === tasklist.guid),
              ),
            ),
          }))
        : [{ section: { guid: '__default__', name: '默认分组' } as GroupSection, tasks: tasksAfterSort }]
    }

    if (groupMode === 'none') {
      return [{ section: { guid: '__all__', name: '全部' } as GroupSection, tasks: tasksAfterSort }]
    }

    const groupedTaskMap = new Map<string, { section: GroupSection; tasks: Task[] }>()
    const appendGroupTask = (section: GroupSection, task: Task) => {
      const existing = groupedTaskMap.get(section.guid)
      if (existing) {
        existing.tasks.push(task)
        return
      }
      groupedTaskMap.set(section.guid, { section, tasks: [task] })
    }

    switch (groupMode) {
      case 'assignee': {
        const noAssigneeSection: GroupSection = { guid: '__assignee-none__', name: '未分配' }
        tasksAfterSort.forEach((task) => {
          const assigneeMembers = task.members.filter((member) => member.role === 'assignee')
          if (assigneeMembers.length === 0) {
            appendGroupTask(noAssigneeSection, task)
            return
          }
          assigneeMembers.forEach((member) => {
            const matchedUser = users.find((user) => user.id === member.id)
            appendGroupTask(
              {
                guid: `__assignee__${member.id}`,
                name: matchedUser?.name ?? member.name ?? member.id,
              },
              task,
            )
          })
        })
        return Array.from(groupedTaskMap.values())
      }
      case 'creator': {
        tasksAfterSort.forEach((task) => {
          const matchedUser = users.find((user) => user.id === task.creator.id)
          appendGroupTask(
            {
              guid: `__creator__${task.creator.id}`,
              name: matchedUser?.name ?? task.creator.id,
            },
            task,
          )
        })
        return Array.from(groupedTaskMap.values())
      }
      case 'start': {
        const sections = startDateGroupDefinitions.map((item) => ({
          section: {
            guid: `__start__${item.key}`,
            name: item.name,
          } as GroupSection,
          tasks: [] as Task[],
        }))
        const sectionMap = new Map(sections.map((item) => [item.section.guid, item]))
        tasksAfterSort.forEach((task) => {
          const groupKey = getDateGroupKey('start', task)
          const target = sectionMap.get(`__start__${groupKey}`)
          if (target) {
            target.tasks.push(task)
          }
        })
        return sections
      }
      case 'due': {
        const sections = dueDateGroupDefinitions.map((item) => ({
          section: {
            guid: `__due__${item.key}`,
            name: item.name,
          } as GroupSection,
          tasks: [] as Task[],
        }))
        const sectionMap = new Map(sections.map((item) => [item.section.guid, item]))
        tasksAfterSort.forEach((task) => {
          const groupKey = getDateGroupKey('due', task)
          const target = sectionMap.get(`__due__${groupKey}`)
          if (target) {
            target.tasks.push(task)
          }
        })
        return sections
      }
      default: {
        if (groupMode.startsWith('custom:')) {
          const fieldGuid = groupMode.slice(7)
          const field = tasklist?.custom_fields.find((item) => item.guid === fieldGuid)
          const optionMap = new Map((field?.options ?? []).map((option) => [option.guid, option.name]))
          const noneSection: GroupSection = { guid: `__custom__${fieldGuid}__none`, name: '未设置' }
          tasksAfterSort.forEach((task) => {
            const fieldValue = task.custom_fields.find((item) => item.guid === fieldGuid)
            const singleValues = fieldValue?.single_select_value ? [fieldValue.single_select_value] : []
            const groupValues = fieldValue?.multi_select_value ?? []
            const values = groupValues.length > 0 ? groupValues : singleValues
            if (values.length === 0) {
              appendGroupTask(noneSection, task)
              return
            }
            values.forEach((value) => {
              appendGroupTask(
                {
                  guid: `__custom__${fieldGuid}__${value}`,
                  name: optionMap.get(value) ?? value,
                },
                task,
              )
            })
          })
          return Array.from(groupedTaskMap.values())
        }
        return [{ section: { guid: '__all__', name: '全部' } as GroupSection, tasks: tasksAfterSort }]
      }
    }
  }

  const groupedTasks = buildGroupedTasksByMode()
  const shouldGroupBySection = groupMode !== 'none'

  const firstCreatableSection = sectionSource[0]

  const createMenuItems = {
    items: [
      {
        key: 'blank',
        icon: <FileAddOutlined />,
        label: '空白任务',
        onClick: () => {
          const firstSection = firstCreatableSection
          if (!firstSection) {
            return
          }
          startInlineCreate(firstSection.guid)
        },
      },
      {
        key: 'template',
        icon: <FileTextFilled />,
        label: '使用模板',
      },
    ],
  }

  const [editingSectionGuid, setEditingSectionGuid] = useState<string | null>(null)

  const [editingSectionName, setEditingSectionName] = useState('')

  const handleStartCreateSection = async () => {
    if (creatingSection) return
    if (!tasklist) {
      message.warning('请先选择一个清单')
      return
    }
    setCreatingSection(true)
    try {
      const apiSection = await apiCreateSection(tasklist.guid, '新分组')
      const nextSection: Section = {
        guid: apiSection.section_id,
        name: apiSection.name,
        sort_order: apiSection.sort_order,
      }
      setLocalSections((prev) => [...prev, nextSection])
      setHasLocalSectionEdits(true)
      onTasklistUpdated?.({
        ...tasklist,
        sections: [...sectionSource, nextSection],
      })
      setAnimatedSectionGuid(nextSection.guid)
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current)
      }
      animationTimerRef.current = window.setTimeout(() => {
        setAnimatedSectionGuid((prev) => (prev === nextSection.guid ? null : prev))
      }, 900)
      // 立即进入重命名模式
      setEditingSectionGuid(nextSection.guid)
      setEditingSectionName(nextSection.name)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建任务分组失败'
      message.error(msg)
    } finally {
      setCreatingSection(false)
    }
  }

  const handleRenameSection = async (sectionGuid: string) => {
    const name = editingSectionName.trim()
    setEditingSectionGuid(null)
    if (!name) return
    const current = sectionSource.find((s) => s.guid === sectionGuid)
    if (!current || current.name === name) return

    // Optimistic
    setLocalSections((prev) =>
      prev.map((s) => (s.guid === sectionGuid ? { ...s, name } : s)),
    )
    setHasLocalSectionEdits(true)

    try {
      await apiUpdateSection(sectionGuid, name)
      if (tasklist) {
        onTasklistUpdated?.({
          ...tasklist,
          sections: sectionSource.map((s) =>
            s.guid === sectionGuid ? { ...s, name } : s,
          ),
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重命名失败'
      message.error(msg)
    }
  }

  const handleDeleteSection = async (sectionGuid: string) => {
    if (!tasklist) return
    const target = sectionSource.find((s) => s.guid === sectionGuid)
    if (!target) return
    if (target.is_default) {
      message.warning('默认任务分组不可删除')
      return
    }
    const defaultSection =
      sectionSource.find((s) => s.is_default) ??
      sectionSource.find((s) => s.guid !== sectionGuid)
    if (!defaultSection) {
      message.warning('没有可迁移到的默认任务分组')
      return
    }
    // 找到该分组下当前清单中的所有任务
    const affectedTasks = tasks.filter((t) =>
      t.tasklists.some(
        (r) =>
          r.tasklist_guid === tasklist.guid && r.section_guid === sectionGuid,
      ),
    )

    const prevLocal = localSections
    const prevHasEdits = hasLocalSectionEdits
    const nextSections = sectionSource.filter((s) => s.guid !== sectionGuid)
    setLocalSections(nextSections)
    setHasLocalSectionEdits(true)
    onTasklistUpdated?.({ ...tasklist, sections: nextSections })

    // 先把任务迁到默认分组（本地 + 后端）
    for (const t of affectedTasks) {
      const updated: Task = {
        ...t,
        tasklists: t.tasklists.map((r) =>
          r.tasklist_guid === tasklist.guid
            ? { ...r, section_guid: defaultSection.guid }
            : r,
        ),
      }
      onTaskUpdated?.(updated)
    }
    try {
      await Promise.all(
        affectedTasks.map((t) => moveTaskToSection(t.guid, defaultSection.guid)),
      )
      await apiDeleteSection(sectionGuid)
      message.success(
        affectedTasks.length > 0
          ? `已删除任务分组，${affectedTasks.length} 个任务已移至「${defaultSection.name}」`
          : '已删除任务分组',
      )
    } catch (err: unknown) {
      setLocalSections(prevLocal)
      setHasLocalSectionEdits(prevHasEdits)
      onTasklistUpdated?.({ ...tasklist, sections: sectionSource })
      for (const t of affectedTasks) onTaskUpdated?.(t)
      const msg = err instanceof Error ? err.message : '删除任务分组失败'
      message.error(msg)
    }
  }

  // ---- Drag & Drop: sections (reorder) + tasks (move between sections) ----
  const [draggingSectionGuid, setDraggingSectionGuid] = useState<string | null>(null)
  const [draggingTaskGuid, setDraggingTaskGuid] = useState<string | null>(null)
  const [dragOverSectionGuid, setDragOverSectionGuid] = useState<string | null>(null)
  const [dragOverMode, setDragOverMode] = useState<'section-before' | 'section-after' | 'task-into' | null>(null)

  const clearDragState = () => {
    setDraggingSectionGuid(null)
    setDraggingTaskGuid(null)
    setDragOverSectionGuid(null)
    setDragOverMode(null)
  }

  const handleSectionDragStart = (e: React.DragEvent, sectionGuid: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-section', sectionGuid)
    setDraggingSectionGuid(sectionGuid)
  }

  const handleTaskDragStart = (e: React.DragEvent, taskGuid: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-task', taskGuid)
    setDraggingTaskGuid(taskGuid)
    e.stopPropagation()
  }

  const handleSectionDragOver = (e: React.DragEvent, sectionGuid: string) => {
    if (draggingSectionGuid && draggingSectionGuid !== sectionGuid) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      setDragOverSectionGuid(sectionGuid)
      setDragOverMode(e.clientY < midY ? 'section-before' : 'section-after')
    } else if (draggingTaskGuid) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverSectionGuid(sectionGuid)
      setDragOverMode('task-into')
    }
  }

  const handleSectionDragLeave = () => {
    // keep it; clear happens on drop / dragend
  }

  const handleSectionDrop = async (e: React.DragEvent, targetSectionGuid: string) => {
    e.preventDefault()
    const srcSection = e.dataTransfer.getData('application/x-section')
    const srcTask = e.dataTransfer.getData('application/x-task')

    // Case 1: drop a section -> reorder
    if (srcSection && srcSection !== targetSectionGuid && tasklist) {
      const orderedRaw = [...sectionSource].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      )
      const fromIndex = orderedRaw.findIndex((s) => s.guid === srcSection)
      let toIndex = orderedRaw.findIndex((s) => s.guid === targetSectionGuid)
      if (fromIndex === -1 || toIndex === -1) {
        clearDragState()
        return
      }
      if (dragOverMode === 'section-after') toIndex += 1
      if (fromIndex < toIndex) toIndex -= 1
      if (toIndex === fromIndex) {
        clearDragState()
        return
      }

      const newSortOrder = computeSectionSortOrder(
        orderedRaw.map((s) => ({
          section_id: s.guid,
          sort_order: s.sort_order ?? 0,
        })),
        fromIndex,
        toIndex,
      )

      const prev = localSections.length > 0 ? localSections : sectionSource
      const nextSections = prev.map((s) =>
        s.guid === srcSection ? { ...s, sort_order: newSortOrder } : s,
      )
      setLocalSections(nextSections)
      setHasLocalSectionEdits(true)

      try {
        await updateSectionSortOrder(srcSection, newSortOrder)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '排序失败'
        message.error(msg)
        setLocalSections(prev)
      }
      clearDragState()
      return
    }

    // Case 2: drop a task -> move between sections
    if (srcTask && tasklist) {
      const task = tasks.find((t) => t.guid === srcTask)
      if (!task) {
        clearDragState()
        return
      }
      const currentRef = task.tasklists.find(
        (r) => r.tasklist_guid === tasklist.guid,
      )
      if (currentRef?.section_guid === targetSectionGuid) {
        clearDragState()
        return
      }

      // optimistic update via callback
      const nextTask: Task = {
        ...task,
        tasklists: task.tasklists.map((r) =>
          r.tasklist_guid === tasklist.guid
            ? { ...r, section_guid: targetSectionGuid }
            : r,
        ),
      }
      onTaskUpdated?.(nextTask)

      try {
        await moveTaskToSection(srcTask, targetSectionGuid)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '移动任务失败'
        message.error(msg)
        onTaskUpdated?.(task)
      }
    }
    clearDragState()
  }
  // ---- end drag & drop ----

  const isTasklistView = Boolean(tasklist)
  const visibleCustomFieldDefs = (tasklist?.custom_fields ?? []).filter((field) =>
    visibleColumnKeys.includes(toCustomFieldColumnKey(field.guid)),
  )
  const allFieldOptions: FieldOption[] = [
    ...allConfigurableColumns.map((column) => ({
      key: column as ExtendedColumnKey,
      label: columnLabelMap[column],
      isVisible: visibleColumnKeys.includes(column),
    })),
    ...extraFieldColumns.map((column) => ({
      key: column as ExtendedColumnKey,
      label: extraColumnLabelMap[column],
      isVisible: visibleColumnKeys.includes(column),
    })),
    ...(tasklist?.custom_fields ?? []).map((field) => ({
      key: toCustomFieldColumnKey(field.guid),
      label: field.name,
      isVisible: visibleColumnKeys.includes(toCustomFieldColumnKey(field.guid)),
      sortOrder: rawCustomFields.find((item) => item.field_id === field.guid)?.sort_order,
    })),
  ]

  const showColumn = (col: ColumnKey) => visibleColumnKeys.includes(col)

  const getColumnDefaultWidth = (columnKey: ResizableColumnKey) =>
    DEFAULT_COLUMN_WIDTHS[columnKey] ??
    (String(columnKey).startsWith('custom:')
      ? DEFAULT_CUSTOM_FIELD_COLUMN_WIDTH
      : DEFAULT_COLUMN_WIDTH)
  const getColumnMinWidth = (columnKey: ResizableColumnKey) =>
    columnKey === 'title' ? MIN_TITLE_COLUMN_WIDTH : MIN_COLUMN_WIDTH
  const getColumnWidth = (columnKey: ResizableColumnKey) =>
    Math.max(getColumnMinWidth(columnKey), columnWidths[columnKey] ?? getColumnDefaultWidth(columnKey))
  const handleColumnResize = useCallback((columnKey: ResizableColumnKey, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnKey]: Math.round(width),
    }))
  }, [])
  const withResizableHeader = (
    column: ColumnType<TaskTableDisplayRow>,
    columnKey: ResizableColumnKey,
  ): ColumnType<TaskTableDisplayRow> => ({
    ...column,
    width: getColumnWidth(columnKey),
    onHeaderCell: () => ({
      columnKey,
      width: getColumnWidth(columnKey),
      minWidth: getColumnMinWidth(columnKey),
      onResize: handleColumnResize,
    }) as React.ThHTMLAttributes<HTMLTableCellElement>,
  })

  const handleAddVisibleColumn = (column: ExtendedColumnKey) => {
    setVisibleColumnKeys((prev) => {
      if (prev.includes(column)) {
        return prev
      }
      return [...prev, column]
    })
  }

  const handleCustomFieldSaved = async (field: ApiCustomField) => {
    await reloadCustomFields()
    handleAddVisibleColumn(toCustomFieldColumnKey(field.field_id))
  }

  const handleCustomFieldDeleted = async (fieldId: string) => {
    setVisibleColumnKeys((prev) =>
      prev.filter((key) => key !== toCustomFieldColumnKey(fieldId)),
    )
    await reloadCustomFields()
  }

  const handleRemoveVisibleColumn = (column: ExtendedColumnKey) => {
    if (column === 'title') {
      return
    }
    setVisibleColumnKeys((prev) => prev.filter((item) => item !== column))
  }

  const handleToggleCustomFieldVisibility = async (field: ApiCustomField) => {
    try {
      await updateCustomField(field.field_id, { is_visible: !field.is_visible })
      if (field.is_visible) {
        handleRemoveVisibleColumn(toCustomFieldColumnKey(field.field_id))
      } else {
        handleAddVisibleColumn(toCustomFieldColumnKey(field.field_id))
      }
      await reloadCustomFields()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新字段显示状态失败'
      message.error(msg)
    }
  }

  const handleCustomFieldSort = async (dragFieldId: string, dropFieldId: string) => {
    if (dragFieldId === dropFieldId) {
      return
    }

    const orderedFields = [...rawCustomFields].sort((a, b) => a.sort_order - b.sort_order)
    const fromIndex = orderedFields.findIndex((field) => field.field_id === dragFieldId)
    const toIndex = orderedFields.findIndex((field) => field.field_id === dropFieldId)
    if (fromIndex === -1 || toIndex === -1) {
      return
    }

    const reordered = [...orderedFields]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    const nextOrderedFields = reordered.map((field, index) => ({
      ...field,
      sort_order: index + 1,
    }))

    setRawCustomFields(nextOrderedFields)

    try {
      await Promise.all(
        nextOrderedFields.map((field, index) =>
          updateCustomField(field.field_id, { sort_order: index + 1 }),
        ),
      )
      await reloadCustomFields()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新字段排序失败'
      message.error(msg)
      await reloadCustomFields()
    }
  }

  const handleRenameTasklist = async (rawName: string) => {
    setEditingTitle(false)
    if (!tasklist) return
    const nextName = rawName.trim() || tasklist.name
    if (nextName === tasklist.name) return
    try {
      await updateProject(tasklist.guid, { name: nextName })
      onTasklistUpdated?.({ ...tasklist, name: nextName })
    } catch {
      message.error('重命名清单失败')
    }
  }

  const handleCloseParentPicker = () => {
    if (parentPickerSubmitting) {
      return
    }
    setParentPickerTask(null)
  }

  const handleSetParentTaskAction = async (task: Task, parentTaskId: string) => {
    if (task.parent_task_guid === parentTaskId) {
      setParentPickerTask(null)
      return
    }

    setParentPickerSubmitting(true)
    try {
      const apiTask = await updateTaskApi(task.guid, { parent_task_id: parentTaskId })
      const nextTask = apiTaskToTask(apiTask, tasklist?.guid)
      handleTaskUpdate(nextTask)
      setParentPickerTask(null)
      onRefresh()
      message.success('已设置父任务')
    } catch (err: unknown) {
      message.error(getActionErrorMessage(err, '设置父任务失败'))
    } finally {
      setParentPickerSubmitting(false)
    }
  }

  // 工具栏数量展示“已添加的条件行数”，但保留单个初始空白行不计数。
  const displayFilterCount = filterConditions.length === 1 && isFilterConditionPristine(filterConditions[0], defaultFilterField)
    ? 0
    : filterConditions.length
  const taskCreateMotionStyle = {
    ['--task-create-duration' as string]: token.motionDurationMid,
    ['--task-create-ease' as string]: token.motionEaseOutBack,
    ['--task-create-highlight' as string]: token.colorFillSecondary,
  } as React.CSSProperties

  const createButton = config.toolbar.showCreate ? (
    <Dropdown menu={createMenuItems}>
      <Button size="small" icon={<PlusOutlined />}>
        新建任务
      </Button>
    </Dropdown>
  ) : null

  const statusMenu = {
    items: (Object.keys(statusFilterLabelMap) as StatusFilterKey[]).map((key) => ({
      key,
      label: statusFilterLabelMap[key],
    })),
    selectable: true,
    selectedKeys: [statusFilter],
    onClick: ({ key }: { key: string }) => setStatusFilter(key as StatusFilterKey),
  }

  const sortMenu = {
    items: visibleSortModes.map((key) => ({
      key,
      label: sortLabelMap[key],
    })),
    selectable: true,
    selectedKeys: [sortMode],
    onClick: ({ key }: { key: string }) => setSortMode(key as SortModeKey),
  }

  const updateFilterCondition = useCallback((conditionId: string, patch: Partial<FilterCondition>) => {
    setFilterConditions((prev) =>
      prev.map((condition) =>
        condition.id === conditionId
          ? { ...condition, ...patch }
          : condition,
      ),
    )
  }, [])

  const handleSelectFilterField = useCallback((conditionId: string, fieldKey: string) => {
    const field = filterFieldConfigMap.get(fieldKey)
    if (!field) {
      return
    }
    const nextCondition = createDefaultFilterCondition(field)
    updateFilterCondition(conditionId, {
      fieldKey,
      operator: nextCondition.operator,
      dateMode: nextCondition.dateMode,
      value: undefined,
      endValue: undefined,
    })
  }, [filterFieldConfigMap, updateFilterCondition])

  const handleSelectFilterOperator = useCallback((conditionId: string, operator: FilterOperator) => {
    setFilterConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId) {
          return condition
        }
        return {
          ...condition,
          operator,
          value: undefined,
          endValue: undefined,
        }
      }),
    )
  }, [])

  const handleAddFilterCondition = useCallback(() => {
    setFilterConditions((prev) => [
      ...prev,
      createDefaultFilterCondition(defaultFilterField),
    ])
  }, [defaultFilterField])

  const handleRemoveFilterCondition = useCallback((conditionId: string) => {
    setFilterConditions((prev) => {
      if (prev.length === 1) {
        return [createDefaultFilterCondition(defaultFilterField)]
      }
      return prev.filter((condition) => condition.id !== conditionId)
    })
  }, [defaultFilterField])

  const handleResetFilterConditions = useCallback(() => {
    setFilterConditions([createDefaultFilterCondition(defaultFilterField)])
  }, [defaultFilterField])

  function renderFilterValueControl(condition: FilterCondition) {
    const field = filterFieldConfigMap.get(condition.fieldKey)
    if (!field) {
      return null
    }

    if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
      return <div className="filter-condition-value filter-condition-value-placeholder" />
    }

    if (field.type === 'date') {
      const isCustomDate = !condition.dateMode || condition.dateMode === 'custom'
      return (
        <div className="filter-condition-value filter-condition-value-date">
          <Select
            size="small"
            value={condition.dateMode ?? 'custom'}
            options={dateModeOptions.map((option) => ({ label: option.label, value: option.key }))}
            onChange={(value) => {
              updateFilterCondition(condition.id, {
                dateMode: value,
                value: value === 'custom' ? condition.value : undefined,
                endValue: value === 'custom' ? condition.endValue : undefined,
              })
            }}
          />
          {isCustomDate && (
            <>
              <DatePicker
                size="small"
                value={normalizeFilterTextValue(condition.value) ? dayjs(Number(normalizeFilterTextValue(condition.value))) : null}
                placeholder="请选择日期"
                onChange={(value) =>
                  updateFilterCondition(condition.id, {
                    value: value ? value.valueOf().toString() : undefined,
                  })
                }
              />
              {condition.operator === 'between' && (
                <DatePicker
                  size="small"
                  value={normalizeFilterTextValue(condition.endValue) ? dayjs(Number(normalizeFilterTextValue(condition.endValue))) : null}
                  placeholder="请选择日期"
                  onChange={(value) =>
                    updateFilterCondition(condition.id, {
                      endValue: value ? value.valueOf().toString() : undefined,
                    })
                  }
                />
              )}
            </>
          )}
        </div>
      )
    }

    if (field.type === 'member') {
      return (
        <div className="filter-condition-value">
          <UserSearchSelect
            users={users}
            placeholder="请选择"
            value={normalizeFilterTextValue(condition.value) || undefined}
            onChange={(value) => updateFilterCondition(condition.id, { value: Array.isArray(value) ? value[0] : value })}
          />
        </div>
      )
    }

    if (field.type === 'select' || field.type === 'multiSelect') {
      return (
        <div className="filter-condition-value">
          <Select
            size="small"
            value={normalizeFilterTextValue(condition.value) || undefined}
            placeholder="请选择"
            options={field.options?.map((option) => ({ label: option.label, value: option.value })) ?? []}
            onChange={(value) => updateFilterCondition(condition.id, { value })}
          />
        </div>
      )
    }

    return (
      <div className="filter-condition-value">
        <Input
          size="small"
          value={normalizeFilterTextValue(condition.value)}
          placeholder="请输入"
          onChange={(event) => updateFilterCondition(condition.id, { value: event.target.value })}
        />
      </div>
    )
  }

  const groupPanel = (
    <div className="toolbar-popover-panel">
      <Typography.Text strong className="popover-title">
        分组方式
      </Typography.Text>
      <div className="group-mode-list">
        {groupModeOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`group-mode-item ${groupMode === option.key ? 'group-mode-item-active' : ''}`}
            onClick={() => setGroupMode(option.key)}
          >
            <span className="group-mode-item-label">{option.label}</span>
            <CheckOutlined className="group-mode-item-check" />
          </button>
        ))}
      </div>
    </div>
  )

  const filterPanel = (
    <div className="task-filter-panel">
      <div className="task-filter-panel-header">
        <Typography.Text strong className="task-filter-panel-title">
          筛选
        </Typography.Text>
        <button type="button" className="task-filter-clear-btn" onClick={handleResetFilterConditions}>
          清空
        </button>
      </div>
      <div className="task-filter-condition-list">
        {filterConditions.map((condition, index) => {
          const field = filterFieldConfigMap.get(condition.fieldKey) ?? filterFieldConfigs[0] ?? systemFilterFieldConfigs[0]
          const operatorOptions = getFilterOperatorsByFieldType(field.type)
          return (
            <div key={condition.id} className="task-filter-condition-row">
              <div className="task-filter-condition-logic">{index === 0 ? '当' : '且'}</div>
              <Select
                size="small"
                className="task-filter-field-select"
                value={condition.fieldKey}
                options={filterFieldConfigs.map((item) => ({ label: item.label, value: item.key }))}
                onChange={(value) => handleSelectFilterField(condition.id, value)}
              />
              <Select
                size="small"
                className="task-filter-operator-select"
                value={condition.operator}
                options={operatorOptions.map((item) => ({ label: item.label, value: item.key }))}
                onChange={(value) => handleSelectFilterOperator(condition.id, value)}
              />
              {renderFilterValueControl(condition)}
              <Button
                type="text"
                size="small"
                className="task-filter-remove-btn"
                icon={<CloseOutlined />}
                onClick={() => handleRemoveFilterCondition(condition.id)}
              />
            </div>
          )
        })}
      </div>
      <Button size="small" className="task-filter-add-btn" onClick={handleAddFilterCondition}>
        添加条件
      </Button>
    </div>
  )

  const customFieldTypeMenuItems = [
    { key: 'select', label: '单选', type: 'select' as ApiCustomFieldType, icon: <CheckCircleOutlined /> },
    { key: 'multi_select', label: '多选', type: 'multi_select' as ApiCustomFieldType, icon: <CheckSquareFilled /> },
    { key: 'member', label: '人员', type: 'member' as ApiCustomFieldType, icon: <UserOutlined /> },
    { key: 'number', label: '数值', type: 'number' as ApiCustomFieldType, icon: <NumberOutlined /> },
    { key: 'date', label: '日期', type: 'date' as ApiCustomFieldType, icon: <CalendarOutlined /> },
    { key: 'text', label: '文本', type: 'text' as ApiCustomFieldType, icon: <FontSizeOutlined /> },
  ]

  const [fieldConfigOpen, setFieldConfigOpen] = useState(false)
  const [customFieldTypeMenuOpen, setCustomFieldTypeMenuOpen] = useState(false)
  const [headerAddOpen, setHeaderAddOpen] = useState(false)

  const handleFieldConfigOpenChange = (open: boolean) => {
    setFieldConfigOpen(open)
    if (!open) {
      setCustomFieldTypeMenuOpen(false)
    }
  }

  const closeFieldConfig = () => {
    setFieldConfigOpen(false)
    setCustomFieldTypeMenuOpen(false)
  }

  const closeHeaderQuickAdd = () => {
    setHeaderAddOpen(false)
  }

  const handlePickType = (t: ApiCustomFieldType) => {
    closeFieldConfig()
    closeHeaderQuickAdd()
    setEditorField(null)
    setEditorInitialType(t)
    setEditorInitialTab('new')
    setEditorInitialDraft(null)
    setEditorOpen(true)
  }

  const handleEditField = (field: ApiCustomField) => {
    closeFieldConfig()
    closeHeaderQuickAdd()
    setEditorField(field)
    setEditorInitialType(field.field_type)
    setEditorInitialTab('new')
    setEditorInitialDraft(null)
    setEditorOpen(true)
  }

  const handlePickRecommendedField = (field: (typeof QUICK_CREATE_RECOMMENDED_FIELDS)[number]) => {
    closeHeaderQuickAdd()
    setEditorField(null)
    setEditorInitialType(field.type)
    setEditorInitialTab('new')
    setEditorInitialDraft({
      name: field.label,
      required: false,
      options: field.draft?.options,
    })
    setEditorOpen(true)
  }

  const handleOpenExistingFieldPicker = () => {
    closeHeaderQuickAdd()
    setEditorField(null)
    setEditorInitialType('text')
    setEditorInitialTab('existing')
    setEditorInitialDraft(null)
    setEditorOpen(true)
  }

  const fieldIconMap: Record<string, React.ReactNode> = {
    priority: <FlagOutlined />,
    assignee: <UserOutlined />,
    estimate: <HourglassOutlined />,
    start: <CalendarOutlined />,
    due: <ClockCircleOutlined />,
    creator: <UserOutlined />,
    created: <CalendarOutlined />,
    subtaskProgress: <BranchesOutlined />,
    taskSource: <TagOutlined />,
    assigner: <UserOutlined />,
    followers: <TeamOutlined />,
    completed: <CalendarOutlined />,
    updated: <HistoryOutlined />,
    taskId: <IdcardOutlined />,
    sourceCategory: <BarsOutlined />,
  }

  const getFieldIcon = (key: ExtendedColumnKey): React.ReactNode => {
    if (typeof key === 'string' && key.startsWith('custom:')) {
      return <NumberOutlined />
    }
    return fieldIconMap[key as string] ?? <UnorderedListOutlined />
  }

  const handleToggleField = (field: FieldOption) => {
    if (typeof field.key === 'string' && field.key.startsWith('custom:')) {
      const customField = rawCustomFields.find((item) => item.field_id === field.key.slice(7))
      if (customField) {
        void handleToggleCustomFieldVisibility(customField)
      }
      return
    }

    if (field.isVisible) {
      handleRemoveVisibleColumn(field.key)
    } else {
      handleAddVisibleColumn(field.key)
    }
  }

  const filteredFieldOptions = allFieldOptions

  const renderFieldConfigRow = (field: FieldOption) => {
    const cfGuid =
      typeof field.key === 'string' && field.key.startsWith('custom:')
        ? field.key.slice(7)
        : null
    const cfRaw = cfGuid ? rawCustomFields.find((r) => r.field_id === cfGuid) : null
    return (
      <div
        key={field.key}
        className="field-config-row-v2"
        draggable={!!cfRaw}
        onDragStart={(event) => {
          if (!cfRaw) return
          event.dataTransfer.setData('application/x-custom-field', cfRaw.field_id)
        }}
        onDragOver={(event) => {
          if (!cfRaw) return
          event.preventDefault()
        }}
        onDrop={(event) => {
          if (!cfRaw) return
          event.preventDefault()
          const dragFieldId = event.dataTransfer.getData('application/x-custom-field')
          if (dragFieldId) {
            void handleCustomFieldSort(dragFieldId, cfRaw.field_id)
          }
        }}
      >
        <span className="field-config-row-drag">
          <HolderOutlined />
        </span>
        <span className="field-config-row-icon">{getFieldIcon(field.key)}</span>
        <span className="field-config-row-label">{field.label}</span>
        {cfRaw && (
          <Button
            type="text"
            size="small"
            className="field-config-row-action"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleEditField(cfRaw)
            }}
          />
        )}
        <Button
          type="text"
          size="small"
          className="field-config-row-visibility"
          icon={field.isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleField(field)
          }}
        />
      </div>
    )
  }

  const fieldConfigPanel = (
    <div className="field-config-layout">
      <div className="field-config-main-panel">
        <div className="field-config-header">
          <Typography.Text strong className="field-config-title">
            字段配置
          </Typography.Text>
        </div>
        {isTasklistView && (
          <div
            className={`field-config-add-row${customFieldTypeMenuOpen ? ' active' : ''}`}
            onMouseEnter={() => setCustomFieldTypeMenuOpen(true)}
            onClick={() => setCustomFieldTypeMenuOpen(true)}
          >
            <PlusOutlined className="field-config-add-icon" />
            <span className="field-config-add-label">添加自定义字段</span>
            <RightOutlined className="field-config-add-arrow" />
          </div>
        )}
        <div
          className="field-config-scroll"
          onMouseEnter={() => setCustomFieldTypeMenuOpen(false)}
        >
          {filteredFieldOptions.length > 0 ? (
            <div className="field-config-section-list">
              {filteredFieldOptions.map(renderFieldConfigRow)}
            </div>
          ) : (
            <div className="field-config-empty">无匹配字段</div>
          )}
        </div>
      </div>
      {isTasklistView && customFieldTypeMenuOpen && (
        <div className="field-config-side-panel field-config-type-menu">
          <div className="field-config-side-section-title">基础字段</div>
          <div className="field-config-side-list">
            {customFieldTypeMenuItems.map((item) => (
              <div
                key={item.key}
                className="field-config-side-item"
                onClick={() => handlePickType(item.type)}
              >
                <span className="field-config-side-item-icon">{item.icon}</span>
                <span className="field-config-side-item-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const quickAddFieldPanel = (
    <div className="field-config-side-panel field-config-type-menu field-config-type-menu-standalone">
      <div className="field-config-side-section-title">基础字段</div>
      <div className="field-config-side-list">
        {customFieldTypeMenuItems.map((item) => (
          <div
            key={item.key}
            className="field-config-side-item"
            onClick={() => handlePickType(item.type)}
          >
            <span className="field-config-side-item-icon">{item.icon}</span>
            <span className="field-config-side-item-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="field-config-side-divider" />
      <div className="field-config-side-section-title">推荐字段</div>
      <div className="field-config-side-list">
        {QUICK_CREATE_RECOMMENDED_FIELDS.map((item) => (
          <div
            key={item.key}
            className="field-config-side-item"
            onClick={() => handlePickRecommendedField(item)}
          >
            <span className="field-config-side-item-icon">
              {item.type === 'number' ? <NumberOutlined /> : <CheckCircleOutlined />}
            </span>
            <span className="field-config-side-item-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="field-config-side-divider" />
      <div
        className="field-config-side-item field-config-side-item-link"
        onClick={handleOpenExistingFieldPicker}
      >
        <span className="field-config-side-item-icon">
          <ReloadOutlined />
        </span>
        <span className="field-config-side-item-label">选择已创建的字段</span>
      </div>
    </div>
  )

  const createTaskInlineRow = (_sectionGuid: string) => null

  const renderInlineCreateTitleCell = (sectionGuid: string) => (
    <div className="inline-create-title-cell">
      <div className="cell cell-checkbox">
        <Checkbox disabled />
      </div>
      <div className="cell cell-title" style={{ overflow: 'visible' }}>
        <Tooltip title="新建任务到此任务分组" placement="top" defaultOpen>
          <Input
            size="small"
            className="inline-title-input"
            placeholder="输入标题，回车确认"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onPressEnter={() => handleInlineCreate(sectionGuid)}
            onFocus={() => setInlineCreateFocusedField('title')}
            onBlur={() => {
              if (inlineCreateInteractingRef.current) {
                inlineCreateInteractingRef.current = false
                return
              }
              if (inlineCreateFocusedField !== 'title') {
                return
              }
              void handleInlineCreate(sectionGuid)
            }}
            autoFocus
          />
        </Tooltip>
      </div>
    </div>
  )

  const renderInlineCreatePriorityCell = (sectionGuid: string) => (
    <div
      className="inline-create-field-cell cell cell-priority"
      onMouseDownCapture={markInlineCreateInteracting}
      data-section-guid={sectionGuid}
    >
      <Select
        size="small"
        variant="borderless"
        value={newTaskPriority}
        onChange={(value) => setNewTaskPriority(value)}
        onDropdownVisibleChange={(open) => {
          if (open) markInlineCreateInteracting()
          setInlineCreateFocusedField(open ? 'priority' : null)
        }}
        style={{ width: '100%' }}
        options={[
          { label: '无优先级', value: Priority.None },
          { label: '低', value: Priority.Low },
          { label: '中', value: Priority.Medium },
          { label: '高', value: Priority.High },
          { label: '紧急', value: Priority.Urgent },
        ]}
      />
    </div>
  )

  const renderInlineCreateAssigneeCell = (sectionGuid: string) => (
    <div className="inline-create-field-cell cell cell-assignee">
      <AssigneePicker
        pickerKey={`inline-assignee-${sectionGuid}`}
        open={activeAssigneePickerKey === `inline-assignee-${sectionGuid}`}
        value={newTaskAssigneeIds}
        users={users}
        isTasklistView={isTasklistView}
        placeholderIcon={
          <UserAddOutlined
            className="empty-assignee"
            style={{ color: '#b8bcc5', fontSize: 16 }}
          />
        }
        onChange={setNewTaskAssigneeIds}
        onInteract={markInlineCreateInteracting}
        onOpenChange={(open) => {
          setActiveAssigneePickerKey(open ? `inline-assignee-${sectionGuid}` : null)
          setInlineCreateFocusedField(open ? 'assignee' : null)
        }}
      />
    </div>
  )

  const renderInlineCreateDateCell = (sectionGuid: string, field: 'start' | 'due') => {
    const date = field === 'start' ? newTaskStart : newTaskDue

    return (
      <div className={`inline-create-field-cell cell cell-${field}`}>
        <Popover
          trigger="click"
          placement="bottomLeft"
          content={
            <DateConfigPanel
              initialField={field}
              startDate={newTaskStart}
              dueDate={newTaskDue}
              onStartChange={setNewTaskStart}
              onDueChange={setNewTaskDue}
              onInteract={markInlineCreateInteracting}
            />
          }
          onOpenChange={(open) => {
            setInlineCreateFocusedField(open ? field : null)
          }}
        >
          <div
            className="date-trigger"
            onMouseDown={markInlineCreateInteracting}
            data-section-guid={sectionGuid}
          >
            <span className="date-text">{date ? date.format('M月D日') : ''}</span>
            <CalendarOutlined className="empty-date-icon" />
          </div>
        </Popover>
      </div>
    )
  }

  const renderInlineCreateCreatorCell = () => (
    <div className="inline-create-field-cell cell cell-creator">
      <Space size={4}>
        <Avatar size={20} style={{ backgroundColor: '#7b67ee', fontSize: 11 }}>
          {currentUser.name.slice(0, 1)}
        </Avatar>
        <span className="creator-name">{currentUser.name}</span>
      </Space>
    </div>
  )

  const handleCustomFieldValueChange = useCallback(
    async (task: Task, field: CustomFieldDef, value: CustomFieldValue) => {
      const nextCustomFields = [
        ...task.custom_fields.filter((item) => item.guid !== field.guid),
        value,
      ]
      const nextTask = {
        ...task,
        custom_fields: nextCustomFields,
      }
      handleTaskUpdate(nextTask)

      const payload: Record<string, unknown> = {
        [field.guid]:
          field.type === 'number'
            ? value.number_value ? Number(value.number_value) : null
            : field.type === 'text'
              ? value.text_value ?? ''
              : field.type === 'datetime'
                ? value.datetime_value ? Number(value.datetime_value) : null
                : field.type === 'single_select'
                  ? value.single_select_value ?? null
                  : field.type === 'multi_select'
                    ? value.multi_select_value ?? []
                    : value.member_value ?? [],
      }

      try {
        // 这里统一走字段值补丁接口，避免新建字段后还要跳到别处才能录入值。
        await patchTaskCustomFields(task.guid, payload)
      } catch (err) {
        handleTaskUpdate(task)
        message.error(getActionErrorMessage(err, '更新自定义字段失败'))
      }
    },
    [handleTaskUpdate],
  )

  const handleTaskStatusFieldChange = useCallback(
    async (task: Task, nextStatus: Task['status']) => {
      const optimistic = { ...task, status: nextStatus }
      handleTaskUpdate(optimistic)
      updateSubtaskInCache(optimistic)

      try {
        await patchTaskStatus(task.guid, nextStatus)
        const fresh = await getTask(task.guid)
        const nextTask = apiTaskToTask(fresh, tasklist?.guid)
        handleTaskUpdate(nextTask)
        updateSubtaskInCache(nextTask)
      } catch (err) {
        handleTaskUpdate(task)
        updateSubtaskInCache(task)
        message.error(getActionErrorMessage(err, '更新状态失败'))
      }
    },
    [handleTaskUpdate, tasklist?.guid],
  )

  function isTaskTableTaskRow(record: TaskTableDisplayRow): record is TaskTableTaskRow {
    return record.rowKind === 'task'
  }

  function buildTaskTreeRows(
    list: Task[],
    sectionGuid: string,
    depth = 0,
  ): TaskTableTaskRow[] {
    return list.map((task) => {
      const children = subtasksByGuid[task.guid] ?? []
      return {
        ...task,
        key: `${sectionGuid}::${task.guid}`,
        rowKind: 'task',
        tableDepth: depth,
        sectionGuid,
        children:
          children.length > 0
            ? buildTaskTreeRows(children, sectionGuid, depth + 1)
            : undefined,
      }
    })
  }

  // 表格的展开状态按任务 guid 维护，但 antd Table 识别的是实际行 key。
  // 这里把当前可见行里的任务 guid 递归展开成 rowKey，避免分组场景下展开状态和行 key 对不上。
  const collectExpandedRowKeys = (
    rows: TaskTableDisplayRow[],
    expandedTaskGuids: Set<string>,
  ): string[] => {
    const result: string[] = []
    const visitRows = (items: TaskTableDisplayRow[]) => {
      for (const item of items) {
        if (!isTaskTableTaskRow(item)) {
          continue
        }
        if (expandedTaskGuids.has(item.guid)) {
          result.push(item.key)
        }
        if (item.children?.length) {
          visitRows(item.children)
        }
      }
    }

    visitRows(rows)
    return result
  }

  const renderSectionRow = (section: Section, sectionTasks: Task[]) => (
    <div
      className={`section-row-content ${animatedSectionGuid === section.guid ? 'section-row-new' : ''} ${
        draggingSectionGuid === section.guid ? 'dragging' : ''
      } ${
        dragOverSectionGuid === section.guid && dragOverMode === 'section-before'
          ? 'drag-over-top'
          : ''
      } ${
        dragOverSectionGuid === section.guid && dragOverMode === 'section-after'
          ? 'drag-over-bottom'
          : ''
      }`}
      onClick={() => toggleSection(section.guid)}
      draggable={isTasklistView && !section.guid.startsWith('__')}
      onDragStart={(e) => handleSectionDragStart(e, section.guid)}
      onDragOver={(e) => handleSectionDragOver(e, section.guid)}
      onDragLeave={handleSectionDragLeave}
      onDrop={(e) => {
        void handleSectionDrop(e, section.guid)
      }}
      onDragEnd={clearDragState}
    >
      {collapsedSections.has(section.guid) ? (
        <CaretRightOutlined className="caret" />
      ) : (
        <CaretDownOutlined className="caret" />
      )}
      {editingSectionGuid === section.guid ? (
        <Input
          size="small"
          className="new-section-input"
          value={editingSectionName}
          onChange={(e) => setEditingSectionName(e.target.value)}
          onPressEnter={() => void handleRenameSection(section.guid)}
          onBlur={() => void handleRenameSection(section.guid)}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span
          className="section-name"
          onDoubleClick={(e) => {
            e.stopPropagation()
            setEditingSectionGuid(section.guid)
            setEditingSectionName(section.name)
          }}
        >
          {section.name}
        </span>
      )}
      <Tag color="default" className="section-count-tag">
        {sectionTasks.length}
      </Tag>
      {isTasklistView && isSectionGroupMode && (
        <div className="section-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => startInlineCreate(section.guid)}
            className="section-action-btn"
          />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'rename',
                  label: '重命名',
                  onClick: () => {
                    setEditingSectionGuid(section.guid)
                    setEditingSectionName(section.name)
                  },
                },
                { type: 'divider' as const },
                {
                  key: 'delete',
                  danger: true,
                  label: '删除任务分组',
                  onClick: () => void handleDeleteSection(section.guid),
                },
              ],
            }}
          >
            <Button
              size="small"
              type="text"
              icon={<EllipsisOutlined />}
              className="section-action-btn"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      )}
    </div>
  )

  const taskColumns: ColumnsType<TaskTableDisplayRow> = [
    withResizableHeader({
      key: 'title',
      dataIndex: 'summary',
      fixed: 'left',
      title: (
        <span className="table-column-title table-column-title-main">
          <FontSizeOutlined />
          <span>任务标题</span>
        </span>
      ),
      width: 407,
      render: (_value, record) => {
        if (record.rowKind === 'section') {
          return renderSectionRow(record.section, record.sectionTasks)
        }
        if (record.rowKind === 'inlineCreate') {
          return renderInlineCreateTitleCell(record.section.guid)
        }
        if (record.rowKind === 'newTask') {
          return (
            <Button
              type="text"
              className="new-task-btn"
              onClick={() => startInlineCreate(record.section.guid)}
              block
            >
              新建任务
            </Button>
          )
        }

        return (
          <TaskTitleCell
            task={record}
            depth={record.tableDepth}
            expanded={expandedTaskGuids.has(record.guid)}
            loadedSubtaskCount={(subtasksByGuid[record.guid] ?? []).length}
            onToggleExpand={handleToggleExpand}
            onToggleStatus={handleToggleStatus}
            onOpenDetail={() => onTaskClick(record)}
            onUpdate={handleTaskUpdate}
          />
        )
      },
    }, 'title'),
  ]

  if (showColumn('priority')) {
    taskColumns.push(withResizableHeader({
      key: 'priority',
      dataIndex: 'priority',
      title: <span>优先级</span>,
      render: (_value, record) =>
        isInlineCreateRow(record) ? (
          renderInlineCreatePriorityCell(record.section.guid)
        ) : isTaskTableTaskRow(record) ? (
          <TaskPriorityCell task={record} onUpdate={handleTaskUpdate} />
        ) : null,
    }, 'priority'))
  }

  if (showColumn('assignee')) {
    taskColumns.push(withResizableHeader({
      key: 'assignee',
      dataIndex: 'members',
      title: (
        <span className="table-column-title">
          <UserOutlined />
          <span>负责人</span>
        </span>
      ),
      render: (_value, record) =>
        isInlineCreateRow(record) ? (
          renderInlineCreateAssigneeCell(record.section.guid)
        ) : isTaskTableTaskRow(record) ? (
          <TaskAssigneeCell
            task={record}
            users={users}
            isTasklistView={isTasklistView}
            activeAssigneePickerKey={activeAssigneePickerKey}
            onUpdate={handleTaskUpdate}
            onAssigneePickerOpenChange={setActiveAssigneePickerKey}
          />
        ) : null,
    }, 'assignee'))
  }

  if (showColumn('estimate')) {
    taskColumns.push(withResizableHeader({
      key: 'estimate',
      dataIndex: 'estimate',
      title: <span>预估工时</span>,
      render: (_value, record) =>
        isInlineCreateRow(record) ? (
          <div className="inline-create-field-cell cell cell-estimate">
            <span className="custom-field-text">-</span>
          </div>
        ) : (
          <span className="custom-field-text">-</span>
        ),
    }, 'estimate'))
  }

  if (showColumn('start')) {
    taskColumns.push(withResizableHeader({
      key: 'start',
      dataIndex: 'start',
      title: (
        <span className="table-column-title">
          <ClockCircleOutlined />
          <span>开始时间</span>
        </span>
      ),
      render: (_value, record) =>
        isInlineCreateRow(record) ? (
          renderInlineCreateDateCell(record.section.guid, 'start')
        ) : isTaskTableTaskRow(record) ? (
          <TaskDateCell task={record} field="start" onUpdate={handleTaskUpdate} />
        ) : null,
    }, 'start'))
  }

  if (showColumn('due')) {
    taskColumns.push(withResizableHeader({
      key: 'due',
      dataIndex: 'due',
      title: (
        <span className="table-column-title">
          <CalendarOutlined />
          <span>截止时间</span>
        </span>
      ),
      render: (_value, record) =>
        isInlineCreateRow(record) ? (
          renderInlineCreateDateCell(record.section.guid, 'due')
        ) : isTaskTableTaskRow(record) ? (
          <TaskDateCell task={record} field="due" onUpdate={handleTaskUpdate} />
        ) : null,
    }, 'due'))
  }

  if (showColumn('creator')) {
    taskColumns.push(withResizableHeader({
      key: 'creator',
      dataIndex: 'creator',
      title: (
        <span className="table-column-title">
          <UserOutlined />
          <span>创建人</span>
        </span>
      ),
      render: (_value, record) => {
        if (isInlineCreateRow(record)) {
          return renderInlineCreateCreatorCell()
        }
        if (!isTaskTableTaskRow(record)) {
          return null
        }
        const creatorUser = {
          id: record.creator.id,
          name: record.creator.name ?? users.find((u) => u.id === record.creator.id)?.name ?? record.creator.id,
          avatar: record.creator.avatar ?? users.find((u) => u.id === record.creator.id)?.avatar,
        }
        return creatorUser ? (
          <Tooltip title={creatorUser.name}>
            <Avatar
              src={creatorUser.avatar}
              size={20}
              style={{ backgroundColor: '#7b67ee', fontSize: 11, cursor: 'default' }}
            >
              {creatorUser.name.slice(0, 1)}
            </Avatar>
          </Tooltip>
        ) : null
      },
    }, 'creator'))
  }

  if (showColumn('created')) {
    taskColumns.push(withResizableHeader({
      key: 'created',
      dataIndex: 'created_at',
      title: <span>创建时间</span>,
      render: (value: string, record) =>
        isInlineCreateRow(record) ? (
          <div className="inline-create-field-cell cell cell-created" />
        ) : isTaskTableTaskRow(record) ? (
          dayjs(Number(value)).format('M月D日 HH:mm')
        ) : null,
    }, 'created'))
  }

  if (visibleColumnKeys.includes('subtaskProgress')) {
    taskColumns.push(withResizableHeader({
      key: 'subtaskProgress',
      dataIndex: 'subtask_count',
      title: <span>子任务进度</span>,
      render: (value: number, record) =>
        isTaskTableTaskRow(record) ? (
          <span className="custom-field-text">{value > 0 ? `0 / ${value}` : '-'}</span>
        ) : null,
    }, 'subtaskProgress'))
  }

  if (visibleColumnKeys.includes('taskSource')) {
    taskColumns.push(withResizableHeader({
      key: 'taskSource',
      dataIndex: 'source',
      title: <span>任务来源</span>,
      render: (_value, record) =>
        isTaskTableTaskRow(record) ? <span className="custom-field-text">任务</span> : null,
    }, 'taskSource'))
  }

  if (visibleColumnKeys.includes('assigner')) {
    taskColumns.push(withResizableHeader({
      key: 'assigner',
      dataIndex: 'creator',
      title: <span>分配人</span>,
      render: (_value, record) => {
        if (!isTaskTableTaskRow(record)) {
          return null
        }
        const creatorUser = users.find((u) => u.id === record.creator.id)
        return <span className="custom-field-text">{creatorUser?.name ?? '-'}</span>
      },
    }, 'assigner'))
  }

  if (visibleColumnKeys.includes('followers')) {
    taskColumns.push(withResizableHeader({
      key: 'followers',
      dataIndex: 'members',
      title: <span>关注人</span>,
      render: (_value, record) => {
        if (!isTaskTableTaskRow(record)) {
          return null
        }
        const followerCount = new Set([
          ...(record.participant_ids ?? []),
          ...record.members
            .filter((member) => member.role === 'follower')
            .map((member) => member.id),
        ]).size
        return <span className="custom-field-text">{followerCount || '-'}</span>
      },
    }, 'followers'))
  }

  if (visibleColumnKeys.includes('completed')) {
    taskColumns.push(withResizableHeader({
      key: 'completed',
      dataIndex: 'completed_at',
      title: <span>完成时间</span>,
      render: (value: string, record) =>
        isTaskTableTaskRow(record) ? (
          <span className="custom-field-text">
            {value && value !== '0' ? dayjs(Number(value)).format('M月D日 HH:mm') : '-'}
          </span>
        ) : null,
    }, 'completed'))
  }

  if (visibleColumnKeys.includes('updated')) {
    taskColumns.push(withResizableHeader({
      key: 'updated',
      dataIndex: 'updated_at',
      title: <span>更新时间</span>,
      render: (value: string, record) =>
        isTaskTableTaskRow(record) ? (
          <span className="custom-field-text">
            {dayjs(Number(value)).format('M月D日 HH:mm')}
          </span>
        ) : null,
    }, 'updated'))
  }

  if (visibleColumnKeys.includes('taskId')) {
    taskColumns.push(withResizableHeader({
      key: 'taskId',
      dataIndex: 'task_id',
      title: <span>任务 ID</span>,
      render: (value: string, record) =>
        isTaskTableTaskRow(record) ? (
          <span className="custom-field-text">{value}</span>
        ) : null,
    }, 'taskId'))
  }

  if (visibleColumnKeys.includes('sourceCategory')) {
    taskColumns.push(withResizableHeader({
      key: 'sourceCategory',
      dataIndex: 'sourceCategory',
      title: <span>来源类别</span>,
      render: (_value, record) =>
        isTaskTableTaskRow(record) ? (
          <span className="custom-field-text">任务列表</span>
        ) : null,
    }, 'sourceCategory'))
  }

  visibleCustomFieldDefs.forEach((field) => {
    const columnKey = toCustomFieldColumnKey(field.guid)
    taskColumns.push(withResizableHeader({
      key: columnKey,
      dataIndex: field.guid,
      title: <span>{field.name}</span>,
      render: (_value, record) =>
        isTaskTableTaskRow(record) ? (
          <CustomFieldCell
            field={field}
            task={record}
            users={users}
            onChange={(value) => void handleCustomFieldValueChange(record, field, value)}
            onStatusChange={(task, nextStatus) => void handleTaskStatusFieldChange(task, nextStatus)}
          />
        ) : null,
    }, columnKey))
  })

  if (isTasklistView) {
    taskColumns.push({
      key: 'quickAddCustomField',
      dataIndex: '__quickAddCustomField',
      title: (
        <Popover
          trigger="click"
          placement="bottomLeft"
          overlayClassName="field-config-popover field-config-popover-quick-add"
          open={headerAddOpen}
          onOpenChange={setHeaderAddOpen}
          content={quickAddFieldPanel}
        >
          <Button
            size="small"
            type="text"
            className="toolbar-quick-add-field-btn"
            icon={<PlusOutlined />}
            aria-label="快速添加自定义字段"
            onClick={(event) => event.stopPropagation()}
          />
        </Popover>
      ),
      width: 52,
      align: 'center',
      render: () => null,
    })
  }

  taskColumns.push({
    key: 'tableLayoutSpacer',
    dataIndex: '__tableLayoutSpacer',
    title: null,
    className: 'task-table-spacer-cell',
    render: () => null,
  })

  const buildTableRows = () => {
    const rows: TaskTableDisplayRow[] = []
    groupedTasks.forEach(({ section, tasks: sectionTasks }) => {
      if (shouldGroupBySection) {
        rows.push({
          key: `section-${section.guid}`,
          guid: section.guid,
          rowKind: 'section',
          section,
          sectionTasks,
        })
      }

      if (!shouldGroupBySection || !collapsedSections.has(section.guid)) {
        rows.push(...buildTaskTreeRows(sectionTasks, section.guid))

        if (shouldGroupBySection && creatingInSection === section.guid) {
          rows.push({
            key: `inline-create-${section.guid}`,
            guid: `inline-create-${section.guid}`,
            rowKind: 'inlineCreate',
            section,
            content: createTaskInlineRow(section.guid),
          })
        } else if (config.toolbar.showCreate && isSectionGroupMode) {
          rows.push({
            key: `new-task-${section.guid}`,
            guid: `new-task-${section.guid}`,
            rowKind: 'newTask',
            section,
          })
        }
      }
    })
    return rows
  }
  const tableRows = buildTableRows()
  const tableScrollX = taskColumns.reduce((sum, column) => {
    if (column.key === 'tableLayoutSpacer') {
      return sum
    }
    const width = Number(column.width)
    return sum + (Number.isFinite(width) ? width : DEFAULT_COLUMN_WIDTH)
  }, 0)

  const renderTaskTable = () => (
    <Table<TaskTableDisplayRow>
      className="task-grid-table"
      rowKey="key"
      size="small"
      pagination={false}
      showHeader={config.showColumnHeader !== false}
      columns={taskColumns}
      dataSource={tableRows}
      scroll={{ x: tableScrollX }}
      components={{ header: { cell: ResizableHeaderCell } }}
      tableLayout="fixed"
      expandable={{
        expandedRowKeys: collectExpandedRowKeys(tableRows, expandedTaskGuids),
        showExpandColumn: false,
        indentSize: 20,
        rowExpandable: (record) =>
          isTaskTableTaskRow(record) && record.subtask_count > 0,
        onExpand: (_expanded, record) => {
          if (isTaskTableTaskRow(record)) {
            void handleToggleExpand(record)
          }
        },
      }}
      rowClassName={(record) =>
        [
          `${record.rowKind}-table-row`,
          isTaskTableTaskRow(record) ? 'task-table-row' : '',
          record.rowKind === 'section' ? 'section-table-row' : '',
          record.rowKind === 'inlineCreate' ? 'inline-create-table-row' : '',
          record.rowKind === 'newTask' ? 'new-task-table-row' : '',
          isTaskTableTaskRow(record) && record.status === 'done' ? 'done' : '',
          isTaskTableTaskRow(record) && record.guid === animatedTaskGuid ? 'task-row-new' : '',
          isTaskTableTaskRow(record) && record.guid === selectedTaskGuid ? 'selected' : '',
          isTaskTableTaskRow(record) && draggingTaskGuid === record.guid ? 'dragging' : '',
          record.rowKind === 'section' &&
          dragOverSectionGuid === record.section.guid &&
          dragOverMode === 'task-into'
            ? 'drag-target-task'
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      }
      onRow={(record) => {
        if (record.rowKind === 'section') {
          if (!isSectionGroupMode || record.section.guid.startsWith('__')) {
            return {}
          }
          return {
            onDragOver: (event) => {
                if (draggingTaskGuid) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDragOverSectionGuid(record.section.guid)
                setDragOverMode('task-into')
              }
            },
            onDrop: (event) => {
              if (draggingTaskGuid) {
                void handleSectionDrop(event, record.section.guid)
              }
            },
          }
        }

        if (!isTaskTableTaskRow(record)) {
          return {}
        }

        return {
          draggable: isTasklistView && record.tableDepth === 0,
          onClick: () => onTaskClick(record),
          onDragStart:
            isTasklistView && record.tableDepth === 0
              ? (event) => handleTaskDragStart(event, record.guid)
              : undefined,
          onDragEnd:
            isTasklistView && record.tableDepth === 0 ? clearDragState : undefined,
        }
      }}
      locale={{
        emptyText: <div className="table-empty-state">{config.emptyState?.title ?? '暂无任务'}</div>,
      }}
    />
  )

  return (
    <div className="task-table" style={taskCreateMotionStyle}>
      {config.showHeaderTitle !== false && (
        <div className="table-header-bar">
          <div className="table-title-row">
            <div className="table-title-meta">
              {isTasklistView && editingTitle ? (
                <div className="table-title-editor">
                  <EditableInput
                    placeholder="输入清单名称"
                    defaultValue={config.title}
                    onSubmit={(value) => {
                      void handleRenameTasklist(value)
                    }}
                  />
                </div>
              ) : (
                <Title
                  level={5}
                  className={`table-title${isTasklistView ? ' editable' : ''}`}
                  onClick={isTasklistView ? () => setEditingTitle(true) : undefined}
                >
                  {config.title}
                </Title>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`table-toolbar ${isTasklistView ? 'tasklist-toolbar' : ''}`}>
        {isTasklistView ? (
          <>
            <div className="toolbar-left-actions">
              <Dropdown menu={statusMenu} trigger={['click']}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<CheckCircleOutlined />}>
                  {statusFilterLabelMap[statusFilter]}
                </Button>
              </Dropdown>
              <Popover trigger="click" placement="bottomLeft" overlayClassName="task-filter-popover" content={filterPanel}>
                <Button
                  size="small"
                  type="text"
                  className={`toolbar-trigger-btn toolbar-filter-btn ${displayFilterCount > 0 ? 'toolbar-filter-btn-active' : ''}`}
                  icon={<FilterOutlined />}
                >
                  <span>筛选</span>
                  {displayFilterCount > 0 && (
                    <span className="toolbar-filter-count">{displayFilterCount}</span>
                  )}
                </Button>
              </Popover>
              <Dropdown menu={sortMenu} trigger={['click']}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<SortAscendingOutlined />}>
                  排序: {sortLabelMap[sortMode]}
                </Button>
              </Dropdown>
              <Popover trigger="click" placement="bottomLeft" content={groupPanel}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<AppstoreOutlined />}>
                  分组: {groupLabelMap[groupMode] ?? '无分组'}
                </Button>
              </Popover>
              <Popover trigger="click" placement="bottomLeft" overlayClassName="field-config-popover" open={fieldConfigOpen} onOpenChange={handleFieldConfigOpenChange} content={fieldConfigPanel}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<SettingOutlined />}>
                  字段配置
                </Button>
              </Popover>
            </div>
          </>
        ) : (
          <>
            {createButton}

            <Space size={2} className="toolbar-right">
              {config.toolbar.statusFilterLabel && (
                <Dropdown menu={statusMenu} trigger={['click']}>
                  <Badge
                    count={config.toolbar.filterBadgeCount ?? 0}
                    size="small"
                    offset={[-2, 2]}
                  >
                    <Button size="small" type="text" icon={<FilterOutlined />}>
                      {statusFilterLabelMap[statusFilter]}
                    </Button>
                  </Badge>
                </Dropdown>
              )}
              <Popover trigger="click" placement="bottomLeft" overlayClassName="task-filter-popover" content={filterPanel}>
                <Button
                  size="small"
                  type="text"
                  className={`toolbar-trigger-btn toolbar-filter-btn ${displayFilterCount > 0 ? 'toolbar-filter-btn-active' : ''}`}
                  icon={<FilterOutlined />}
                >
                  <span>筛选</span>
                  {displayFilterCount > 0 && (
                    <span className="toolbar-filter-count">{displayFilterCount}</span>
                  )}
                </Button>
              </Popover>
              {config.toolbar.showSort && (
                <Dropdown menu={sortMenu} trigger={['click']}>
                  <Button size="small" type="text" icon={<SortAscendingOutlined />}>
                    排序 · {sortLabelMap[sortMode]}
                  </Button>
                </Dropdown>
              )}
              {config.toolbar.showSubtask && (
                <Button size="small" type="text" icon={<SubnodeOutlined />}>
                  子任务
                </Button>
              )}
              {config.toolbar.showFieldConfig && (
                <Popover trigger="click" placement="bottomLeft" overlayClassName="field-config-popover" open={fieldConfigOpen} onOpenChange={handleFieldConfigOpenChange} content={fieldConfigPanel}>
                  <Button size="small" type="text" icon={<SettingOutlined />}>
                    字段配置
                  </Button>
                </Popover>
              )}
            </Space>
          </>
        )}
      </div>

      <div className="table-body">
        <>
          {renderTaskTable()}

          {isSectionGroupMode && (
            <Button
              type="text"
              icon={<PlusOutlined />}
              className="new-section-btn"
              onClick={() => void handleStartCreateSection()}
              loading={creatingSection}
              block
            >
              新建任务分组
            </Button>
          )}
        </>
      </div>
      {tasklist && (
        <TaskParentPickerModal
          open={Boolean(parentPickerTask)}
          task={parentPickerTask}
          tasks={tasks}
          submitting={parentPickerSubmitting}
          onClose={handleCloseParentPicker}
          onSubmit={(parentTaskId) => {
            if (!parentPickerTask) {
              return
            }
            return handleSetParentTaskAction(parentPickerTask, parentTaskId)
          }}
        />
      )}
      {tasklist && (
        <CustomFieldsModal
          open={customFieldsModalOpen}
          projectId={tasklist.guid}
          onClose={() => setCustomFieldsModalOpen(false)}
          onChanged={() => void reloadCustomFields()}
        />
      )}
      {tasklist && (
        <CustomFieldEditorModal
          open={editorOpen}
          projectId={tasklist.guid}
          initialType={editorInitialType}
          initialTab={editorInitialTab}
          initialDraft={editorInitialDraft}
          field={editorField}
          existingFields={rawCustomFields}
          onClose={() => {
            setEditorOpen(false)
            setEditorInitialTab('new')
            setEditorInitialDraft(null)
          }}
          onSaved={(field) => void handleCustomFieldSaved(field)}
          onDeleted={(fieldId) => void handleCustomFieldDeleted(fieldId)}
          onPickExisting={(f) => {
            void (async () => {
              try {
                await updateCustomField(f.field_id, { is_visible: true })
                handleAddVisibleColumn(toCustomFieldColumnKey(f.field_id))
                await reloadCustomFields()
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : '启用字段失败'
                message.error(msg)
              }
            })()
          }}
        />
      )}
    </div>
  )
}

interface TaskTitleCellProps {
  task: Task
  depth?: number
  expanded?: boolean
  loadedSubtaskCount?: number
  onToggleExpand?: (task: Task) => void
  onToggleStatus: (e: React.MouseEvent, task: Task) => void
  onOpenDetail: () => void
  onUpdate: (task: Task) => void
}

interface TaskPriorityCellProps {
  task: Task
  onUpdate: (task: Task) => void
}

interface TaskAssigneeCellProps {
  task: Task
  users: User[]
  isTasklistView: boolean
  activeAssigneePickerKey: string | null
  onUpdate: (task: Task) => void
  onAssigneePickerOpenChange: (key: string | null) => void
}

interface TaskDateCellProps {
  task: Task
  field: 'start' | 'due'
  onUpdate: (task: Task) => void
}

interface CustomFieldCellProps {
  field: CustomFieldDef
  task: Task
  users: User[]
  onChange: (value: CustomFieldValue) => void
  onStatusChange: (task: Task, nextStatus: Task['status']) => void
}

function CustomFieldCell({
  field,
  task,
  users,
  onChange,
  onStatusChange,
}: CustomFieldCellProps) {
  const [editing, setEditing] = useState(false)
  const fieldValue = task.custom_fields.find((item) => item.guid === field.guid)
  const textValue = fieldValue?.text_value ?? ''
  const numberValue = fieldValue?.number_value ?? ''
  const dateValue = fieldValue?.datetime_value
    ? dayjs(Number(fieldValue.datetime_value))
    : null
  const singleValue = fieldValue?.single_select_value
  const multiValue = fieldValue?.multi_select_value ?? []
  const memberValue = fieldValue?.member_value?.map((member) => member.id) ?? []
  const displayValue = formatCustomFieldValue(task, field, users)
  const hasValue = displayValue !== '-'
  const selectedSingleValues =
    field.guid === 'status'
      ? [task.status]
      : singleValue ? [singleValue] : []

  const exitEditing = () => {
    setEditing(false)
  }

  const enterEditing = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    setEditing(true)
  }

  const renderPlaceholder = (label: string) => (
    <span className="custom-field-placeholder">{label}</span>
  )

  const renderReadTrigger = (content: React.ReactNode) => (
    <div
      className="custom-field-trigger"
      data-has-value={hasValue ? 'true' : 'false'}
      onClick={enterEditing}
    >
      {content}
    </div>
  )

  if (!editing) {
    if (field.type === 'single_select' && hasValue) {
      return renderReadTrigger(renderSelectFieldTags(field, selectedSingleValues))
    }

    if (field.type === 'multi_select' && multiValue.length > 0) {
      return renderReadTrigger(renderSelectFieldTags(field, multiValue))
    }

    return renderReadTrigger(
      hasValue ? (
        <span className="custom-field-text">{displayValue}</span>
      ) : (
        renderPlaceholder('点击填写')
      ),
    )
  }

  if (field.type === 'text') {
    return (
      <div
        className="custom-field-editor custom-field-editor-text"
        onClick={(event) => event.stopPropagation()}
      >
        <Input
          size="small"
          value={textValue}
          placeholder="输入文本"
          autoFocus
          onChange={(e) => onChange({ guid: field.guid, text_value: e.target.value })}
          onBlur={exitEditing}
          onPressEnter={exitEditing}
        />
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div
        className="custom-field-editor custom-field-editor-number"
        onClick={(event) => event.stopPropagation()}
      >
        <Input
          size="small"
          value={numberValue}
          placeholder="输入数字"
          autoFocus
          onChange={(e) => onChange({ guid: field.guid, number_value: e.target.value })}
          onBlur={exitEditing}
          onPressEnter={exitEditing}
        />
      </div>
    )
  }

  if (field.type === 'datetime') {
    return (
      <div
        className="custom-field-editor custom-field-editor-date"
        onClick={(event) => event.stopPropagation()}
      >
        <DatePicker
          size="small"
          value={dateValue}
          placeholder="选择日期"
          autoFocus
          onChange={(value) => {
            onChange({
              guid: field.guid,
              datetime_value: value ? value.valueOf().toString() : undefined,
            })
            exitEditing()
          }}
          onOpenChange={(open) => {
            if (!open) {
              exitEditing()
            }
          }}
        />
      </div>
    )
  }

  if (field.type === 'single_select') {
    return (
      <div
        className="custom-field-editor custom-field-editor-select"
        onClick={(event) => event.stopPropagation()}
      >
        <Select
          size="small"
          autoFocus
          value={field.guid === 'status' ? task.status : singleValue}
          placeholder="选择选项"
          allowClear
          options={buildSelectableCustomFieldOptions(field, selectedSingleValues)}
          onChange={(value) => {
            if (field.guid === 'status') {
              onStatusChange(task, (value || 'todo') as Task['status'])
            } else {
              onChange({ guid: field.guid, single_select_value: value || undefined })
            }
            exitEditing()
          }}
          onOpenChange={(open) => {
            if (!open) {
              exitEditing()
            }
          }}
        />
      </div>
    )
  }

  if (field.type === 'multi_select') {
    return (
      <div
        className="custom-field-editor custom-field-editor-select"
        onClick={(event) => event.stopPropagation()}
      >
        <Select
          mode="multiple"
          size="small"
          autoFocus
          value={multiValue}
          placeholder="选择选项"
          options={buildSelectableCustomFieldOptions(field, multiValue)}
          onChange={(value) => onChange({ guid: field.guid, multi_select_value: value })}
          onBlur={exitEditing}
          onOpenChange={(open) => {
            if (!open) {
              exitEditing()
            }
          }}
        />
      </div>
    )
  }

  if (field.type === 'member') {
    return (
      <div
        className="custom-field-editor custom-field-editor-select"
        onClick={(event) => event.stopPropagation()}
      >
        <Select
          mode="multiple"
          size="small"
          autoFocus
          value={memberValue}
          placeholder="选择成员"
          options={users.map((user) => ({ label: user.name, value: user.id }))}
          onChange={(value) =>
            onChange({
              guid: field.guid,
              member_value: value.map((id) => ({
                id,
                type: 'user' as const,
                name: users.find((user) => user.id === id)?.name,
              })),
            })}
          onBlur={exitEditing}
          onOpenChange={(open) => {
            if (!open) {
              exitEditing()
            }
          }}
        />
      </div>
    )
  }

  return (
    <span className="custom-field-text">
      {formatCustomFieldValue(task, field, users)}
    </span>
  )
}

function TaskTitleCell({
  task,
  depth = 0,
  expanded = false,
  loadedSubtaskCount,
  onToggleExpand,
  onToggleStatus,
  onOpenDetail,
  onUpdate,
}: TaskTitleCellProps) {
  const [editingName, setEditingName] = useState(false)
  const statusToggleTooltip = task.status === 'done' ? '标记未完成' : '标记已完成'

  const handleRenameSummary = async (rawName: string) => {
    setEditingName(false)
    const nextName = rawName.trim() || task.summary
    if (nextName === task.summary) return
    onUpdate({ ...task, summary: nextName })
    try {
      const apiTask = await updateTaskApi(task.guid, { title: nextName })
      onUpdate(apiTaskToTask(apiTask))
    } catch {
      onUpdate(task)
      message.error('重命名任务失败')
    }
  }

  return (
    <div className={`task-title-cell ${task.status === 'done' ? 'done' : ''}`}>
      <div className="task-row-main">
        {depth > 0 && (
          <span
            className="task-tree-guide"
            style={{ width: depth * 20 }}
            aria-hidden
          />
        )}
        <div className="cell cell-checkbox" onClick={(e) => e.stopPropagation()}>
          <Tooltip
            title={statusToggleTooltip}
            placement="top"
            color="#000"
            overlayInnerStyle={{ color: '#fff' }}
          >
            <Checkbox
              checked={task.status === 'done'}
              onClick={(e) => onToggleStatus(e, task)}
            />
          </Tooltip>
        </div>
        <div className="cell cell-title">
          {task.subtask_count > 0 ? (
            <CaretRightOutlined
              className="subtask-icon"
              style={{
                cursor: 'pointer',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 0.15s',
              }}
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.(task)
              }}
            />
          ) : depth > 0 ? (
            <span className="subtask-icon" style={{ visibility: 'hidden' }}>
              <CaretRightOutlined />
            </span>
          ) : null}
          {editingName ? (
            <div className="task-name-editor">
              <EditableInput
                placeholder="输入任务名称"
                defaultValue={task.summary}
                onSubmit={(value) => {
                  void handleRenameSummary(value)
                }}
              />
            </div>
          ) : (
            <span
              className={task.status === 'done' ? 'done-text' : 'title-text'}
              onClick={(e) => {
                e.stopPropagation()
                setEditingName(true)
              }}
            >
              {task.summary}
            </span>
          )}
          {task.subtask_count > 0 && !editingName && (
            <Tag className="subtask-tag">
              {loadedSubtaskCount ?? 0} / {task.subtask_count}
            </Tag>
          )}
          {!editingName && (
            <span
              className="task-detail-hotspot"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetail()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TaskPriorityCell({ task, onUpdate }: TaskPriorityCellProps) {
  const showPriority = task.priority !== Priority.None

  const handlePriorityChange = async (nextPriority: Priority) => {
    if (nextPriority === task.priority) return
    const prev = task
    onUpdate({ ...task, priority: nextPriority })
    try {
      const apiTask = await updateTaskApi(task.guid, {
        priority: toPriorityString(nextPriority),
      })
      onUpdate(apiTaskToTask(apiTask))
    } catch {
      onUpdate(prev)
      message.error('更新优先级失败')
    }
  }

  return (
    <div className="cell cell-priority" onClick={(e) => e.stopPropagation()}>
      <Dropdown
        trigger={['click']}
        menu={{
          selectable: true,
          selectedKeys: [String(task.priority)],
          items: [
            { key: String(Priority.None), label: '无优先级' },
            { key: String(Priority.Low), label: '低' },
            { key: String(Priority.Medium), label: '中' },
            { key: String(Priority.High), label: '高' },
            { key: String(Priority.Urgent), label: '紧急' },
          ],
          onClick: ({ key }) => {
            void handlePriorityChange(Number(key) as Priority)
          },
        }}
      >
        {showPriority ? (
          <Tag
            variant="filled"
            className="priority-tag priority-tag-editable"
            style={{
              color: PriorityColor[task.priority],
              backgroundColor: `${PriorityColor[task.priority]}1a`,
              cursor: 'pointer',
            }}
          >
            <FlagFilled />
            <span>{PriorityLabel[task.priority]}</span>
          </Tag>
        ) : (
          <span
            className="priority-placeholder"
            style={{ cursor: 'pointer', display: 'inline-block', minWidth: 24 }}
          >
            -
          </span>
        )}
      </Dropdown>
    </div>
  )
}

function TaskAssigneeCell({
  task,
  users,
  isTasklistView,
  activeAssigneePickerKey,
  onUpdate,
  onAssigneePickerOpenChange,
}: TaskAssigneeCellProps) {
  const assignees = task.members.filter((m) => m.role === 'assignee')
  const assigneeIds = assignees.map((member) => member.id)
  const assigneePickerKey = `task-assignee-${task.guid}`

  const handleAssigneeChange = async (values: string[]) => {
    const nextAssigneeIds = Array.from(new Set(values.filter(Boolean)))
    const currentAssigneeIds = Array.from(new Set(assigneeIds))
    const isSameSelection =
      nextAssigneeIds.length === currentAssigneeIds.length &&
      nextAssigneeIds.every((id) => currentAssigneeIds.includes(id))
    const defaultParticipantIds = buildDefaultParticipantIds(task.creator.id, nextAssigneeIds)
    const newMembers = [
      ...nextAssigneeIds.map((id) => ({
        id,
        role: 'assignee' as const,
        type: 'user' as const,
        name: users.find((u) => u.id === id)?.name,
        avatar: users.find((u) => u.id === id)?.avatar,
      })),
      ...task.members.filter((m) => m.role === 'follower'),
    ]
    onUpdate(applyParticipantIdsToTask({ ...task, members: newMembers }, [
      ...(task.participant_ids ?? []),
      ...defaultParticipantIds,
    ]))
    try {
      if (!isSameSelection) {
        await patchTaskAssignee(task.guid, nextAssigneeIds)
        if (defaultParticipantIds.length > 0) {
          await addParticipants(task.guid, defaultParticipantIds)
        }
      }
      const fresh = await getTask(task.guid)
      onUpdate(apiTaskToTask(fresh))
    } catch {
      onUpdate(task)
      message.error('更新负责人失败')
    }
  }

  return (
    <div className="cell cell-assignee" onClick={(e) => e.stopPropagation()}>
      <AssigneePicker
        pickerKey={assigneePickerKey}
        open={activeAssigneePickerKey === assigneePickerKey}
        value={assigneeIds}
        users={users}
        taskMembers={assignees}
        isTasklistView={isTasklistView}
        triggerClassName="assignee-trigger"
        placeholderIcon={<UserOutlined className="empty-assignee" />}
        onChange={(value) => void handleAssigneeChange(value)}
        onOpenChange={(open) => {
          onAssigneePickerOpenChange(open ? assigneePickerKey : null)
        }}
      />
    </div>
  )
}

function TaskDateCell({ task, field, onUpdate }: TaskDateCellProps) {
  const isSubtask = Boolean(task.parent_task_guid)
  const date = task[field] ? dayjs(Number(task[field]!.timestamp)) : null

  const handleDateChange = async (nextDate: dayjs.Dayjs | null) => {
    if (field === 'start' && isSubtask) {
      message.warning('子任务开始时间跟随父任务，不能单独修改')
      return
    }

    const patch: Partial<Task> = {}
    if (nextDate) {
      patch[field] = { timestamp: nextDate.valueOf().toString(), is_all_day: false }
    } else {
      patch[field] = undefined
    }
    onUpdate({ ...task, ...patch })
    try {
      const apiPatch: Record<string, string | null> = {}
      if (field === 'start') apiPatch.start_date = nextDate ? nextDate.toISOString() : null
      else apiPatch.due_date = nextDate ? nextDate.toISOString() : null
      const apiTask = await updateTaskApi(task.guid, apiPatch)
      onUpdate(apiTaskToTask(apiTask))
    } catch {
      onUpdate(task)
      message.error('更新时间失败')
    }
  }

  return (
    <div className={`cell cell-${field}`} onClick={(e) => e.stopPropagation()}>
      {field === 'start' && isSubtask ? (
        <div
          className="date-trigger date-trigger-readonly"
          title="子任务开始时间跟随父任务，不能单独修改"
        >
          {date ? (
            <span className="date-text">{date.format('M月D日')}</span>
          ) : (
            <CalendarOutlined className="empty-date-icon" />
          )}
        </div>
      ) : (
        <Popover
          trigger="click"
          placement="bottomLeft"
          content={
            <div style={{ width: 260 }} onMouseDown={(e) => e.preventDefault()}>
              <Calendar
                fullscreen={false}
                value={date ?? undefined}
                onSelect={(value) => void handleDateChange(value)}
                disabledDate={
                  field === 'due'
                    ? (current) => current && current < dayjs().startOf('day')
                    : undefined
                }
              />
              {date && (
                <div style={{ textAlign: 'right', padding: '4px 8px' }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => void handleDateChange(null)}
                  >
                    清除
                  </Button>
                </div>
              )}
            </div>
          }
        >
          <div className="date-trigger">
            {date ? (
              <span className="date-text">{date.format('M月D日')}</span>
            ) : (
              <CalendarOutlined className="empty-date-icon" />
            )}
          </div>
        </Popover>
      )}
    </div>
  )
}

function renderSelectFieldTags(field: CustomFieldDef, values: string[]) {
  const visibleValues = values.filter(Boolean)
  if (visibleValues.length === 0) {
    return <span className="custom-field-placeholder">点击填写</span>
  }

  return (
    <span className="custom-field-tag-list">
      {visibleValues.map((value) => {
        const option = field.options?.find((item) => item.guid === value)
        const label = option?.name ?? value
        const isDisabled = option?.is_disabled === true
        return (
          <Tag
            key={value}
            className={`custom-field-value-tag ${
              isDisabled ? 'custom-field-value-tag-disabled' : ''
            }`}
            style={
              !isDisabled && option?.color
                ? {
                  color: option.color,
                  backgroundColor: `${option.color}24`,
                }
                : undefined
            }
          >
            {label}
          </Tag>
        )
      })}
    </span>
  )
}

function renderSelectOptionLabel(name: string, isDisabled: boolean) {
  if (!isDisabled) {
    return name
  }

  return <span className="custom-field-disabled-option-label">{name}</span>
}

function buildSelectableCustomFieldOptions(field: CustomFieldDef, selectedValues: string[]) {
  const selectedValueSet = new Set(selectedValues.filter(Boolean))

  return (field.options ?? [])
    .filter((option) => !option.is_disabled || selectedValueSet.has(option.guid))
    .map((option) => ({
      label: renderSelectOptionLabel(option.name, option.is_disabled === true),
      value: option.guid,
      disabled: option.is_disabled === true,
    }))
}

function getDateGroupKey(field: 'start' | 'due', task: Task) {
  const rawValue = field === 'start' ? task.start?.timestamp : task.due?.timestamp
  if (!rawValue) {
    return 'none'
  }

  const valueDate = dayjs(Number(rawValue)).startOf('day')
  const today = dayjs().startOf('day')
  const tomorrow = today.add(1, 'day')
  const nextWeekEnd = today.add(7, 'day')

  if (field === 'start') {
    if (valueDate.isBefore(today)) {
      return 'started'
    }
  } else if (valueDate.isBefore(today)) {
    return 'overdue'
  }

  if (valueDate.isSame(today, 'day')) {
    return 'today'
  }
  if (valueDate.isSame(tomorrow, 'day')) {
    return 'tomorrow'
  }
  if (valueDate.isAfter(tomorrow) && (valueDate.isBefore(nextWeekEnd) || valueDate.isSame(nextWeekEnd, 'day'))) {
    return 'next7'
  }
  return 'later'
}

function formatCustomFieldValue(task: Task, field: CustomFieldDef, users: User[]): string {
  if (field.guid === 'status') {
    return taskStatusLabelMap[task.status] ?? '-'
  }

  const fieldValue = task.custom_fields.find((item) => item.guid === field.guid)
  if (!fieldValue) {
    return '-'
  }

  switch (field.type) {
    case 'number':
      return fieldValue.number_value || '-'
    case 'text':
      return fieldValue.text_value?.trim() || '-'
    case 'datetime':
      return fieldValue.datetime_value
        ? dayjs(Number(fieldValue.datetime_value)).format('YYYY/M/D')
        : '-'
    case 'single_select':
      return field.options?.find((option) => option.guid === fieldValue.single_select_value)?.name ?? '-'
    case 'multi_select':
      return fieldValue.multi_select_value
        ?.map((value) => field.options?.find((option) => option.guid === value)?.name ?? value)
        .join('、') || '-'
    case 'member':
      return fieldValue.member_value
        ?.map((member) => member.name ?? users.find((user) => user.id === member.id)?.name ?? member.id)
        .join('、') || '-'
    default:
      return '-'
  }
}
