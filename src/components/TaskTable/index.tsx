import { useState, useEffect, useCallback, useRef } from 'react'
import Input from 'antd/es/input'
import Checkbox from 'antd/es/checkbox'
import Popover from 'antd/es/popover'
import Calendar from 'antd/es/calendar'
import Select from 'antd/es/select'
import Button from 'antd/es/button'
import Dropdown from 'antd/es/dropdown'
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
  EyeOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  UserOutlined,
  UserAddOutlined,
  FileAddOutlined,
  FileTextFilled,
  SubnodeOutlined,
  MoreOutlined,
  EllipsisOutlined,
  FlagFilled,
  CheckSquareFilled,
  CheckCircleOutlined,
  AppstoreOutlined,
  DownOutlined,
  FontSizeOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  ReloadOutlined,
  UpOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  Priority,
  PriorityLabel,
  PriorityColor,
  type Task,
  type User,
  type Tasklist,
  type Section,
  type CustomFieldDef,
} from '@/types/task'
import {
  createTaskApi,
  updateTaskApi,
  patchTaskStatus,
  patchTaskAssignee,
  apiTaskToTask,
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

interface FieldOption {
  key: ExtendedColumnKey
  label: string
  isVisible: boolean
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
type GroupModeKey = 'section' | 'none'
type DateFieldKey = 'start' | 'due'
type CalendarViewMode = 'month' | 'year'

const statusFilterLabelMap: Record<StatusFilterKey, string> = {
  all: '全部任务',
  todo: '未完成',
  done: '已完成',
}

const sortLabelMap: Record<SortModeKey, string> = {
  custom: '拖拽自定义',
  due: '截止时间',
  start: '开始时间',
  created: '创建时间',
}

const groupLabelMap: Record<GroupModeKey, string> = {
  section: '自定义分组',
  none: '无分组',
}

interface TaskTableProps {
  config: ViewConfig
  tasks: Task[]
  sections?: Section[]
  tasklist?: Tasklist
  selectedTaskGuid?: string
  onTaskClick: (task: Task) => void
  onRefresh: () => void
  onTaskCreated?: (task: Task, section?: Section) => void
  onTaskUpdated?: (task: Task) => void
  onTasklistUpdated?: (tasklist: Tasklist) => void
  onTaskCreatedDetailOpen?: (task: Task) => void
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
  value: string[]
  users: User[]
  placeholderIcon: React.ReactNode
  isTasklistView: boolean
  triggerClassName?: string
  onChange: (values: string[]) => void
  onInteract?: () => void
  onOpenChange?: (open: boolean) => void
}

function AssigneePicker({
  pickerKey,
  open,
  value,
  users,
  placeholderIcon,
  isTasklistView,
  triggerClassName,
  onChange,
  onInteract,
  onOpenChange,
}: AssigneePickerProps) {
  const popupContainerRef = useRef<HTMLDivElement | null>(null)
  const [selectOpen, setSelectOpen] = useState(false)
  const selectedUsers = value
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is User => Boolean(user))

  useEffect(() => {
    setSelectOpen(open)
  }, [open, pickerKey])

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
          <Typography.Text strong style={{ fontSize: 12 }}>
            添加负责人
          </Typography.Text>
          <Select
            mode="multiple"
            size="small"
            open={selectOpen}
            onOpenChange={setSelectOpen}
            getPopupContainer={() => popupContainerRef.current ?? document.body}
            style={{ width: '100%', marginTop: 8 }}
            placeholder="搜索用户"
            value={value}
            onChange={onChange}
            options={users.map((user) => ({ label: user.name, value: user.id }))}
            autoFocus
            showSearch
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
            <div className="tasklist-assignee-group">
              {selectedUsers.map((user) => (
                <Tooltip key={user.id} title={user.name ?? user.id}>
                  <Avatar
                    size={20}
                    className="tasklist-assignee-avatar"
                    style={{ backgroundColor: '#f5d7b5', color: '#7a4d15', fontSize: 11 }}
                  >
                    {(user.name ?? user.id).slice(0, 1)}
                  </Avatar>
                </Tooltip>
              ))}
            </div>
          ) : (
            <Avatar.Group max={{ count: 3 }} size={24}>
              {selectedUsers.map((user) => (
                <Tooltip key={user.id} title={user.name ?? user.id}>
                  <Avatar
                    size={24}
                    style={{ backgroundColor: '#7b67ee', fontSize: 12 }}
                  >
                    {(user.name ?? user.id).slice(0, 1)}
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

export default function TaskTable({
  config,
  tasks,
  sections,
  tasklist,
  selectedTaskGuid,
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
  const [inlineCreateFocusedField, setInlineCreateFocusedField] = useState<
    'title' | 'assignee' | 'start' | 'due' | null
  >(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>(
    config.toolbar.statusFilterLabel === '未完成' ? 'todo' : 'all',
  )
  const [sortMode, setSortMode] = useState<SortModeKey>(
    config.toolbar.sortLabel === '截止时间' ? 'due' : 'custom',
  )
  const [groupMode, setGroupMode] = useState<GroupModeKey>(
    config.groupBySection ? 'section' : 'none',
  )
  const [mineOnlyFilter, setMineOnlyFilter] = useState(false)
  const [hasDueFilter, setHasDueFilter] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<ExtendedColumnKey[]>(config.columns)
  const [localSections, setLocalSections] = useState<Section[]>(sections ?? [])
  const [hasLocalSectionEdits, setHasLocalSectionEdits] = useState(false)
  const [creatingSection, setCreatingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [activeAssigneePickerKey, setActiveAssigneePickerKey] = useState<string | null>(null)
  const [expandedTaskGuids, setExpandedTaskGuids] = useState<Set<string>>(new Set())
  const [subtasksByGuid, setSubtasksByGuid] = useState<Record<string, Task[]>>({})

  // 当外部 tasks 更新时（如详情页更改状态），同步子任务缓存
  useEffect(() => {
    setSubtasksByGuid((prev) => {
      let changed = false
      const next: Record<string, Task[]> = {}
      for (const [pid, list] of Object.entries(prev)) {
        const updated = list.map((child) => {
          const fresh = tasks.find((t) => t.guid === child.guid)
          if (fresh && fresh !== child) {
            changed = true
            return fresh
          }
          return child
        })
        next[pid] = updated
      }
      return changed ? next : prev
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
          [guid]: items.map((t) => apiTaskToTask(t)),
        }))
      } catch {
        setSubtasksByGuid((prev) => ({ ...prev, [guid]: [] }))
      }
    }
  }, [subtasksByGuid])
  const [creatingCustomField, setCreatingCustomField] = useState(false)
  const animationTimerRef = useRef<number | null>(null)
  const inlineCreateInteractingRef = useRef(false)
  const [editingTitle, setEditingTitle] = useState(false)

  useEffect(() => {
    listMembers()
      .then((members) =>
        setUsers(members.map((m) => ({ id: m.user_id, name: m.user_id }))),
      )
      .catch(() => {})
  }, [])

  const sectionSource = hasLocalSectionEdits ? localSections : (sections ?? [])

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

  const handleInlineCreate = async (sectionGuid?: string) => {
    if (submittingSectionGuid === sectionGuid) {
      return
    }
    const summary = newTaskTitle.trim()
    if (!summary) {
      resetInlineCreate()
      return
    }
    setSubmittingSectionGuid(sectionGuid ?? null)
    try {
      const assigneeId = newTaskAssigneeIds.length > 0
        ? newTaskAssigneeIds[0]
        : currentUser.id
      const apiTask = await createTaskApi({
        project_id: tasklist!.guid,
        title: summary,
        assignee_id: assigneeId,
        priority: toPriorityString(newTaskPriority),
        section_id: sectionGuid,
        start_date: newTaskStart ? newTaskStart.toISOString() : undefined,
        due_date: newTaskDue ? newTaskDue.toISOString() : undefined,
      })
      const createdTask = apiTaskToTask(apiTask, tasklist?.guid)
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
      setSubmittingSectionGuid(null)
    }
  }

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
    } catch {
      handleTaskUpdate(task)
      updateSubtaskInCache(task)
      message.error('更新状态失败')
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

  const handleTaskUpdate = (nextTask: Task) => {
    updateSubtaskInCache(nextTask)
    onTaskUpdated?.(nextTask)
    if (!onTaskUpdated) {
      onRefresh()
    }
  }

  const tasksAfterFilter = tasks.filter((task) => {
    // 过滤掉有父任务的子任务，子任务通过父行展开显示
    if (task.parent_task_guid) {
      return false
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false
    }

    if (
      mineOnlyFilter &&
      !task.members.some(
        (member) => member.role === 'assignee' && member.id === currentUser.id,
      )
    ) {
      return false
    }

    if (hasDueFilter && !task.due) {
      return false
    }

    return true
  })

  const tasksAfterSort =
    sortMode === 'custom'
      ? tasksAfterFilter
      : [...tasksAfterFilter].sort((left, right) => {
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

  const shouldGroupBySection = groupMode === 'section'
  const sortedSections = [...sectionSource].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )
  const groupedTasks = shouldGroupBySection
    ? sortedSections.length > 0
      ? sortedSections.map((section) => ({
          section,
          tasks: tasksAfterSort.filter((t) =>
            t.tasklists.some(
              (ref) =>
                ref.section_guid === section.guid &&
                (!tasklist || ref.tasklist_guid === tasklist.guid),
            ),
          ),
        }))
      : [{ section: { guid: '__default__', name: '默认分组' } as Section, tasks: tasksAfterSort }]
    : [{ section: { guid: '__all__', name: '全部' } as Section, tasks: tasksAfterSort }]

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
      const msg = err instanceof Error ? err.message : '创建分组失败'
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
      message.warning('默认分组不可删除')
      return
    }
    const defaultSection =
      sectionSource.find((s) => s.is_default) ??
      sectionSource.find((s) => s.guid !== sectionGuid)
    if (!defaultSection) {
      message.warning('没有可迁移到的默认分组')
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
          ? `已删除分组，${affectedTasks.length} 个任务已移至「${defaultSection.name}」`
          : '已删除分组',
      )
    } catch (err: unknown) {
      setLocalSections(prevLocal)
      setHasLocalSectionEdits(prevHasEdits)
      onTasklistUpdated?.({ ...tasklist, sections: sectionSource })
      for (const t of affectedTasks) onTaskUpdated?.(t)
      const msg = err instanceof Error ? err.message : '删除分组失败'
      message.error(msg)
    }
  }

  const handleCreateSection = async () => {
    const name = newSectionName.trim()
    if (!tasklist || !name) {
      setCreatingSection(false)
      setNewSectionName('')
      return
    }

    try {
      const apiSection = await apiCreateSection(tasklist.guid, name)
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
      setNewSectionName('')
      setCreatingSection(false)
      setAnimatedSectionGuid(nextSection.guid)
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current)
      }
      animationTimerRef.current = window.setTimeout(() => {
        setAnimatedSectionGuid((prev) => (prev === nextSection.guid ? null : prev))
      }, 900)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建分组失败'
      message.error(msg)
      setCreatingSection(false)
      setNewSectionName('')
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
    })),
  ]

  const showColumn = (col: ColumnKey) => visibleColumnKeys.includes(col)

  const handleAddVisibleColumn = (column: ExtendedColumnKey) => {
    setVisibleColumnKeys((prev) => {
      if (prev.includes(column)) {
        return prev
      }
      return [...prev, column]
    })
  }

  const handleRemoveVisibleColumn = (column: ExtendedColumnKey) => {
    if (column === 'title') {
      return
    }
    setVisibleColumnKeys((prev) => prev.filter((item) => item !== column))
  }

  const handleCreateCustomTextField = async () => {
    if (!tasklist || creatingCustomField) {
      return
    }

    setCreatingCustomField(true)
    const nextIndex = tasklist.custom_fields.filter((field) => field.type === 'text').length + 1
    const nextField: CustomFieldDef = {
      guid: `cf_${Date.now().toString(36)}`,
      name: `文字字段${nextIndex}`,
      type: 'text',
    }

    try {
      const nextTasklist = { ...tasklist, custom_fields: [...tasklist.custom_fields, nextField] }
      onTasklistUpdated?.(nextTasklist)
      handleAddVisibleColumn(toCustomFieldColumnKey(nextField.guid))
    } catch {
      message.error('新增字段失败')
    } finally {
      setCreatingCustomField(false)
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
  const visibleColumns = visibleColumnKeys.length
  const activeFilterCount = Number(mineOnlyFilter) + Number(hasDueFilter)
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
    items: (Object.keys(sortLabelMap) as SortModeKey[]).map((key) => ({
      key,
      label: sortLabelMap[key],
    })),
    selectable: true,
    selectedKeys: [sortMode],
    onClick: ({ key }: { key: string }) => setSortMode(key as SortModeKey),
  }

  const groupMenu = {
    items: (Object.keys(groupLabelMap) as GroupModeKey[]).map((key) => ({
      key,
      label: groupLabelMap[key],
    })),
    selectable: true,
    selectedKeys: [groupMode],
    onClick: ({ key }: { key: string }) => setGroupMode(key as GroupModeKey),
  }

  const filterPanel = (
    <div className="toolbar-popover-panel">
      <Typography.Text strong className="popover-title">
        筛选条件
      </Typography.Text>
      <Checkbox
        checked={mineOnlyFilter}
        onChange={(e) => setMineOnlyFilter(e.target.checked)}
      >
        仅看我负责的
      </Checkbox>
      <Checkbox
        checked={hasDueFilter}
        onChange={(e) => setHasDueFilter(e.target.checked)}
      >
        仅看有截止时间
      </Checkbox>
    </div>
  )

  const fieldConfigPanel = (
    <div className="toolbar-popover-panel field-config-panel">
      <Typography.Text strong className="popover-title">
        字段配置
      </Typography.Text>
      {isTasklistView && (
        <Button
          type="text"
          size="small"
          className="field-config-create-btn"
          icon={<PlusOutlined />}
          loading={creatingCustomField}
          onClick={() => void handleCreateCustomTextField()}
        >
          添加自定义文字字段
        </Button>
      )}
      <div className="field-config-list">
        {allFieldOptions.map((field) => (
          <div
            key={field.key}
            className={`field-config-row${field.isVisible ? ' is-visible' : ''}`}
          >
            <button
              type="button"
              className="field-config-row-main"
              onClick={() => handleAddVisibleColumn(field.key)}
            >
              <span className="field-config-row-label">{field.label}</span>
            </button>
            {field.isVisible ? (
              <Button
                type="text"
                size="small"
                className="field-config-row-action"
                icon={<EyeOutlined />}
                onClick={() => handleRemoveVisibleColumn(field.key)}
              />
            ) : (
              <Button
                type="text"
                size="small"
                className="field-config-row-action"
                icon={<PlusOutlined />}
                onClick={() => handleAddVisibleColumn(field.key)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const createTaskInlineRow = (sectionGuid: string) => (
    <div className="task-row creating task-row-enter inline-create-row">
      <div className="cell cell-checkbox">
        <Checkbox disabled />
      </div>
      {showColumn('title') && (
        <div className="cell cell-title" style={{ overflow: 'visible' }}>
          <Tooltip title="新建任务到此分组" placement="top" defaultOpen>
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
      )}
      {showColumn('priority') && (
        <div className="cell cell-priority">
          <Select
            size="small"
            variant="borderless"
            value={newTaskPriority}
            onChange={(value) => setNewTaskPriority(value)}
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
      )}
      {showColumn('assignee') && (
        <div className="cell cell-assignee">
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
      )}
      {showColumn('estimate') && <div className="cell cell-estimate" />}
      {showColumn('start') && (
        <div className="cell cell-start">
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <DateConfigPanel
                initialField="start"
                startDate={newTaskStart}
                dueDate={newTaskDue}
                onStartChange={setNewTaskStart}
                onDueChange={setNewTaskDue}
                onInteract={markInlineCreateInteracting}
              />
            }
            onOpenChange={(open) => {
              setInlineCreateFocusedField(open ? 'start' : null)
            }}
          >
            <div className="date-trigger" onMouseDown={markInlineCreateInteracting}>
              <span className="date-text">
                {newTaskStart ? newTaskStart.format('M月D日') : ''}
              </span>
              <CalendarOutlined className="empty-date-icon" />
            </div>
          </Popover>
        </div>
      )}
      {showColumn('due') && (
        <div className="cell cell-due">
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <DateConfigPanel
                initialField="due"
                startDate={newTaskStart}
                dueDate={newTaskDue}
                onStartChange={setNewTaskStart}
                onDueChange={setNewTaskDue}
                onInteract={markInlineCreateInteracting}
              />
            }
            onOpenChange={(open) => {
              setInlineCreateFocusedField(open ? 'due' : null)
            }}
          >
            <div className="date-trigger" onMouseDown={markInlineCreateInteracting}>
              <span className="date-text">
                {newTaskDue ? newTaskDue.format('M月D日') : ''}
              </span>
              <CalendarOutlined className="empty-date-icon" />
            </div>
          </Popover>
        </div>
      )}
      {showColumn('creator') && (
        <div className="cell cell-creator">
          <Space size={4}>
            <Avatar size={20} style={{ backgroundColor: '#7b67ee', fontSize: 11 }}>
              {currentUser.name.slice(0, 1)}
            </Avatar>
            <span className="creator-name">{currentUser.name}</span>
          </Space>
        </div>
      )}
      {showColumn('created') && <div className="cell cell-created" />}
      {isTasklistView && <div className="cell cell-more" />}
    </div>
  )

  return (
    <div className="task-table" style={taskCreateMotionStyle}>
      {config.showHeaderTitle !== false && (
        <div className="table-header-bar">
          <div className="table-title-row">
            <div className="table-title-meta">
              {isTasklistView && <CheckSquareFilled style={{ color: '#3370ff', fontSize: 18, marginTop: 2 }} />}
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
              {isTasklistView && !editingTitle && (
                <Button type="text" size="small" icon={<EllipsisOutlined />} style={{ color: '#646a73' }} />
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`table-toolbar ${isTasklistView ? 'tasklist-toolbar' : ''}`}>
        {isTasklistView ? (
          <>
            <div className="toolbar-left-actions">
              {config.toolbar.showCreate && (
                <Dropdown menu={createMenuItems}>
                  <Button size="small" icon={<PlusOutlined />} className="toolbar-create-btn">
                    新建任务 <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                  </Button>
                </Dropdown>
              )}
              <Dropdown menu={statusMenu} trigger={['click']}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<CheckCircleOutlined />}>
                  {statusFilterLabelMap[statusFilter]}
                </Button>
              </Dropdown>
              <Popover trigger="click" placement="bottomLeft" content={filterPanel}>
                <Badge
                  count={activeFilterCount}
                  size="small"
                  offset={[-2, 2]}
                  className="toolbar-badge"
                >
                  <Button size="small" type="text" className="toolbar-trigger-btn" icon={<FilterOutlined />}>
                    筛选
                  </Button>
                </Badge>
              </Popover>
              <Dropdown menu={sortMenu} trigger={['click']}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<SortAscendingOutlined />}>
                  排序: {sortLabelMap[sortMode]}
                </Button>
              </Dropdown>
              <Dropdown menu={groupMenu} trigger={['click']}>
                <Button size="small" type="text" className="toolbar-trigger-btn" icon={<AppstoreOutlined />}>
                  分组: {groupLabelMap[groupMode]}
                </Button>
              </Dropdown>
              <Popover trigger="click" placement="bottomRight" content={fieldConfigPanel}>
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
              <Popover trigger="click" placement="bottomRight" content={filterPanel}>
                <Badge count={activeFilterCount} size="small" offset={[-2, 2]}>
                  <Button size="small" type="text" icon={<FilterOutlined />}>
                    筛选
                  </Button>
                </Badge>
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
                <Popover trigger="click" placement="bottomRight" content={fieldConfigPanel}>
                  <Button size="small" type="text" icon={<SettingOutlined />}>
                    字段配置
                  </Button>
                </Popover>
              )}
            </Space>
          </>
        )}
      </div>

      {config.showColumnHeader !== false && (
        <div
          className={`table-columns ${isTasklistView ? 'tasklist-columns' : ''}`}
          style={{ ['--visible-columns' as string]: visibleColumns }}
        >
          {showColumn('title') && (
            <div className="col col-title">
              <FontSizeOutlined style={{ marginRight: 4 }} /><span>任务标题</span>
            </div>
          )}
          {showColumn('priority') && (
            <div className="col col-priority">
              <span>优先级</span>
            </div>
          )}
          {showColumn('assignee') && (
            <div className="col col-assignee">
              <UserOutlined style={{ marginRight: 4 }} /><span>负责人</span>
            </div>
          )}
          {showColumn('estimate') && (
            <div className="col col-estimate">
              <span>预估工时</span>
            </div>
          )}
          {showColumn('start') && (
            <div className="col col-start">
              <ClockCircleOutlined style={{ marginRight: 4 }} /><span>开始时间</span>
            </div>
          )}
          {showColumn('due') && (
            <div className="col col-due">
              <CalendarOutlined style={{ marginRight: 4 }} /><span>截止时间</span>
            </div>
          )}
          {showColumn('creator') && (
            <div className="col col-creator">
              <UserOutlined style={{ marginRight: 4 }} /><span>创建人</span>
            </div>
          )}
          {showColumn('created') && (
            <div className="col col-created">
              <span>创建时间</span>
            </div>
          )}
          {visibleColumnKeys.includes('subtaskProgress') && (
            <div className="col col-custom">
              <span>子任务进度</span>
            </div>
          )}
          {visibleColumnKeys.includes('taskSource') && (
            <div className="col col-custom">
              <span>任务来源</span>
            </div>
          )}
          {visibleColumnKeys.includes('assigner') && (
            <div className="col col-custom">
              <span>分配人</span>
            </div>
          )}
          {visibleColumnKeys.includes('followers') && (
            <div className="col col-custom">
              <span>关注人</span>
            </div>
          )}
          {visibleColumnKeys.includes('completed') && (
            <div className="col col-custom">
              <span>完成时间</span>
            </div>
          )}
          {visibleColumnKeys.includes('updated') && (
            <div className="col col-custom">
              <span>更新时间</span>
            </div>
          )}
          {visibleColumnKeys.includes('taskId') && (
            <div className="col col-custom">
              <span>任务 ID</span>
            </div>
          )}
          {visibleColumnKeys.includes('sourceCategory') && (
            <div className="col col-custom">
              <span>来源类别</span>
            </div>
          )}
          {visibleCustomFieldDefs.map((field) => (
            <div key={field.guid} className="col col-custom">
              <span>{field.name}</span>
            </div>
          ))}
          <Popover trigger="click" placement="bottomRight" content={fieldConfigPanel}>
            <div className="col col-add">
              <PlusOutlined />
            </div>
          </Popover>
        </div>
      )}

      <div className="table-body">
        <>
          {groupedTasks.map(({ section, tasks: sectionTasks }) => (
            <div
              key={section.guid}
              className={`section-group ${
                dragOverSectionGuid === section.guid && dragOverMode === 'task-into'
                  ? 'drag-target-task'
                  : ''
              }`}
              onDragOver={(e) => {
                if (draggingTaskGuid) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverSectionGuid(section.guid)
                  setDragOverMode('task-into')
                }
              }}
              onDrop={(e) => {
                if (draggingTaskGuid) {
                  void handleSectionDrop(e, section.guid)
                }
              }}
            >
              {shouldGroupBySection && (
                <div
                  className={`section-row ${animatedSectionGuid === section.guid ? 'section-row-new' : ''} ${
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
                  {isTasklistView && (
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
                              label: '删除分组',
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
              )}

              {(!shouldGroupBySection || !collapsedSections.has(section.guid)) && (
                <>
                  {(() => {
                    const renderTask = (
                      task: Task,
                      depth: number,
                    ): React.ReactNode => {
                      const isExpanded = expandedTaskGuids.has(task.guid)
                      const children = subtasksByGuid[task.guid] ?? []
                      return (
                        <div key={task.guid}>
                          <div
                            draggable={isTasklistView && depth === 0}
                            onDragStart={
                              depth === 0
                                ? (e) => handleTaskDragStart(e, task.guid)
                                : undefined
                            }
                            onDragEnd={clearDragState}
                            className={`task-row-wrap ${
                              draggingTaskGuid === task.guid ? 'dragging' : ''
                            }`}
                          >
                            <TaskRow
                              task={task}
                              users={users}
                              columns={visibleColumnKeys}
                              customFields={visibleCustomFieldDefs}
                              isTasklistView={isTasklistView}
                              activeAssigneePickerKey={activeAssigneePickerKey}
                              isNew={task.guid === animatedTaskGuid}
                              isSelected={task.guid === selectedTaskGuid}
                              depth={depth}
                              expanded={isExpanded}
                              loadedSubtaskCount={children.length}
                              onToggleExpand={handleToggleExpand}
                              onToggleStatus={handleToggleStatus}
                              onClick={() => onTaskClick(task)}
                              onUpdate={handleTaskUpdate}
                              onAssigneePickerOpenChange={setActiveAssigneePickerKey}
                            />
                          </div>
                          {isExpanded &&
                            children.map((child) => renderTask(child, depth + 1))}
                        </div>
                      )
                    }
                    return sectionTasks.map((task) => renderTask(task, 0))
                  })()}

                  {config.toolbar.showCreate && shouldGroupBySection && (
                    creatingInSection === section.guid ? (
                      createTaskInlineRow(section.guid)
                    ) : (
                      <Button
                        type="text"
                        className="new-task-btn"
                        onClick={() => startInlineCreate(section.guid)}
                        block
                      >
                        新建任务
                      </Button>
                    )
                  )}
                </>
              )}
            </div>
          ))}

          {shouldGroupBySection && (
            <Button
              type="text"
              icon={<PlusOutlined />}
              className="new-section-btn"
              onClick={() => void handleStartCreateSection()}
              loading={creatingSection}
              block
            >
              新建分组
            </Button>
          )}
        </>
      </div>
    </div>
  )
}

interface TaskRowProps {
  task: Task
  users: User[]
  columns: ExtendedColumnKey[]
  customFields: CustomFieldDef[]
  isTasklistView: boolean
  activeAssigneePickerKey: string | null
  isNew?: boolean
  isSelected?: boolean
  depth?: number
  expanded?: boolean
  loadedSubtaskCount?: number
  onToggleExpand?: (task: Task) => void
  onToggleStatus: (e: React.MouseEvent, task: Task) => void
  onClick: () => void
  onUpdate: (task: Task) => void
  onAssigneePickerOpenChange: (key: string | null) => void
}

function TaskRow({
  task,
  users,
  columns,
  customFields,
  isTasklistView,
  activeAssigneePickerKey,
  isNew,
  isSelected,
  depth = 0,
  expanded = false,
  loadedSubtaskCount,
  onToggleExpand,
  onToggleStatus,
  onClick,
  onUpdate,
  onAssigneePickerOpenChange,
}: TaskRowProps) {
  const [editingName, setEditingName] = useState(false)
  const assignees = task.members.filter((m) => m.role === 'assignee')
  const assigneeIds = assignees.map((assignee) => assignee.id)
  const assigneePickerKey = `task-assignee-${task.guid}`
  const creatorUser = users.find((u) => u.id === task.creator.id)
  const has = (col: ColumnKey) => columns.includes(col)
  const showPriority = task.priority !== Priority.None
  const startDate = task.start ? dayjs(Number(task.start.timestamp)) : null
  const dueDate = task.due ? dayjs(Number(task.due.timestamp)) : null

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

  const handleAssigneeChange = async (values: string[]) => {
    const newMembers = [
      ...values.map((id) => ({
        id,
        role: 'assignee' as const,
        type: 'user' as const,
        name: users.find((u) => u.id === id)?.name,
      })),
      ...task.members.filter((m) => m.role === 'follower'),
    ]
    onUpdate({ ...task, members: newMembers })
    try {
      const apiTask = await patchTaskAssignee(task.guid, values[0] ?? null)
      onUpdate(apiTaskToTask(apiTask))
    } catch {
      onUpdate(task)
      message.error('更新负责人失败')
    }
  }

  const handleDateChange = async (
    field: 'start' | 'due',
    date: dayjs.Dayjs | null,
  ) => {
    const patch: Partial<Task> = {}
    if (date) {
      patch[field] = { timestamp: date.valueOf().toString(), is_all_day: false }
    } else {
      patch[field] = undefined
    }
    onUpdate({ ...task, ...patch })
    try {
      const apiPatch: Record<string, string | null> = {}
      if (field === 'start') apiPatch.start_date = date ? date.toISOString() : null
      else apiPatch.due_date = date ? date.toISOString() : null
      const apiTask = await updateTaskApi(task.guid, apiPatch)
      onUpdate(apiTaskToTask(apiTask))
    } catch {
      onUpdate(task)
      message.error('更新时间失败')
    }
  }

  return (
    <div
      className={`task-row ${task.status === 'done' ? 'done' : ''} ${isNew ? 'task-row-new' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="cell cell-checkbox" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.status === 'done'}
          onClick={(e) => onToggleStatus(e, task)}
        />
      </div>
      {has('title') && (
        <div className="cell cell-title">
          {depth > 0 && (
            <span
              className="task-tree-guide"
              style={{ width: depth * 20 }}
              aria-hidden
            />
          )}
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
        </div>
      )}
      {has('priority') && (
        <div className="cell cell-priority">
          {showPriority ? (
            <Tag
              variant="filled"
              className="priority-tag"
              style={{
                color: PriorityColor[task.priority],
                backgroundColor: `${PriorityColor[task.priority]}1a`,
              }}
            >
              <FlagFilled />
              <span>{PriorityLabel[task.priority]}</span>
            </Tag>
          ) : (
            <span className="priority-placeholder">-</span>
          )}
        </div>
      )}
      {has('assignee') && (
        <div className="cell cell-assignee" onClick={(e) => e.stopPropagation()}>
          <AssigneePicker
            pickerKey={assigneePickerKey}
            open={activeAssigneePickerKey === assigneePickerKey}
            value={assigneeIds}
            users={users}
            isTasklistView={isTasklistView}
            triggerClassName="assignee-trigger"
            placeholderIcon={<UserOutlined className="empty-assignee" />}
            onChange={(values) => void handleAssigneeChange(values)}
            onOpenChange={(open) => {
              onAssigneePickerOpenChange(open ? assigneePickerKey : null)
            }}
          />
        </div>
      )}
      {has('estimate') && (
        <div className="cell cell-estimate">
          <span className="date-text" />
        </div>
      )}
      {has('start') && (
        <div className="cell cell-start" onClick={(e) => e.stopPropagation()}>
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <div style={{ width: 260 }} onMouseDown={(e) => e.preventDefault()}>
                <Calendar
                  fullscreen={false}
                  value={startDate ?? undefined}
                  onSelect={(value) => void handleDateChange('start', value)}
                />
                {startDate && (
                  <div style={{ textAlign: 'right', padding: '4px 8px' }}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => void handleDateChange('start', null)}
                    >
                      清除
                    </Button>
                  </div>
                )}
              </div>
            }
          >
            <div className="date-trigger">
              {startDate ? (
                <span className="date-text">{startDate.format('M月D日')}</span>
              ) : (
                <CalendarOutlined className="empty-date-icon" />
              )}
            </div>
          </Popover>
        </div>
      )}
      {has('due') && (
        <div className="cell cell-due" onClick={(e) => e.stopPropagation()}>
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <div style={{ width: 260 }} onMouseDown={(e) => e.preventDefault()}>
                <Calendar
                  fullscreen={false}
                  value={dueDate ?? undefined}
                  onSelect={(value) => void handleDateChange('due', value)}
                  disabledDate={(current) =>
                    current && current < dayjs().startOf('day')
                  }
                />
                {dueDate && (
                  <div style={{ textAlign: 'right', padding: '4px 8px' }}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => void handleDateChange('due', null)}
                    >
                      清除
                    </Button>
                  </div>
                )}
              </div>
            }
          >
            <div className="date-trigger">
              {dueDate ? (
                <span className="date-text">{dueDate.format('M月D日')}</span>
              ) : (
                <CalendarOutlined className="empty-date-icon" />
              )}
            </div>
          </Popover>
        </div>
      )}
      {has('creator') && (
        <div className="cell cell-creator">
          {isTasklistView ? (
            <span className="creator-name">{creatorUser?.name ?? ''}</span>
          ) : (
            <Space size={4}>
              {creatorUser && (
                <Avatar
                  size={20}
                  style={{ backgroundColor: '#7b67ee', fontSize: 11 }}
                >
                  {creatorUser.name.slice(0, 1)}
                </Avatar>
              )}
              <span className="creator-name">{creatorUser?.name ?? ''}</span>
            </Space>
          )}
        </div>
      )}
      {has('created') && (
        <div className="cell cell-created">
          {dayjs(Number(task.created_at)).format('M月D日 HH:mm')}
        </div>
      )}
      {columns.includes('subtaskProgress') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">
            {task.subtask_count > 0 ? `0 / ${task.subtask_count}` : '-'}
          </span>
        </div>
      )}
      {columns.includes('taskSource') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">任务</span>
        </div>
      )}
      {columns.includes('assigner') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">{creatorUser?.name ?? '-'}</span>
        </div>
      )}
      {columns.includes('followers') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">
            {task.members.filter((member) => member.role === 'follower').length || '-'}
          </span>
        </div>
      )}
      {columns.includes('completed') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">
            {task.completed_at && task.completed_at !== '0'
              ? dayjs(Number(task.completed_at)).format('M月D日 HH:mm')
              : '-'}
          </span>
        </div>
      )}
      {columns.includes('updated') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">
            {dayjs(Number(task.updated_at)).format('M月D日 HH:mm')}
          </span>
        </div>
      )}
      {columns.includes('taskId') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">{task.task_id}</span>
        </div>
      )}
      {columns.includes('sourceCategory') && (
        <div className="cell cell-custom">
          <span className="custom-field-text">任务列表</span>
        </div>
      )}
      {customFields.map((field) => (
        <div key={field.guid} className="cell cell-custom">
          <span className="custom-field-text">
            {formatCustomFieldValue(task, field, users)}
          </span>
        </div>
      ))}
      {isTasklistView && (
        <div className="cell cell-more">
          <MoreOutlined />
        </div>
      )}
    </div>
  )
}

function formatCustomFieldValue(task: Task, field: CustomFieldDef, users: User[]): string {
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
