import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Button from 'antd/es/button'
import Checkbox from 'antd/es/checkbox'
import Input from 'antd/es/input'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Avatar from 'antd/es/avatar'
import Popover from 'antd/es/popover'
import Card from 'antd/es/card'
import Dropdown from 'antd/es/dropdown'
import message from 'antd/es/message'
import Modal from 'antd/es/modal'
import List from 'antd/es/list'
import Tooltip from 'antd/es/tooltip'
import Breadcrumb from 'antd/es/breadcrumb'
import Empty from 'antd/es/empty'
import Spin from 'antd/es/spin'
import {
  CloseOutlined,
  MoreOutlined,
  UserOutlined,
  CalendarOutlined,
  PaperClipOutlined,
  BranchesOutlined,
  PlusOutlined,
  CheckOutlined,
  DeleteOutlined,
  AlignLeftOutlined,
  UsergroupAddOutlined,
  EyeOutlined,
  DownloadOutlined,
  DownOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  LeftOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Calendar from 'antd/es/calendar'
import type { Section, Task, Tasklist, User } from '@/types/task'
import { appConfig } from '@/config/appConfig'
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
  type ApiComment,
} from '@/services/commentService'
import { listMembers } from '@/services/teamService'
import {
  listAttachments,
  uploadAttachment,
  getAttachment,
  deleteAttachment,
  downloadAttachment,
  buildAttachmentPreviewUrl,
  isImageAttachment,
  type ApiAttachment,
} from '@/services/attachmentService'
import Upload from 'antd/es/upload'
import Popconfirm from 'antd/es/popconfirm'
import {
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  patchTaskStatus,
  patchTaskAssignee,
  addParticipants,
  removeParticipant,
  listSubtasks,
  getTask,
  listTaskActivities,
  apiTaskToTask,
  applyParticipantIdsToTask,
  buildDefaultParticipantIds,
  type ApiTaskActivity,
} from '@/services/taskService'
import {
  updateProject as apiUpdateProject,
} from '@/services/projectService'
import { listSections, moveTaskToSection } from '@/services/sectionService'
import { FilePreviewRenderer } from '@/components/file-preview'
import TaskRichInput, {
  TaskRichText,
  normalizeRichContent,
  type TaskRichAttachmentSource,
} from '@/components/TaskRichInput'
import UserSearchSelect from '@/components/UserSearchSelect'
import { inheritParentStartForTasks } from '@/utils/taskDate'
import './index.less'

const { Text } = Typography
const PARENT_TASK_CHAIN_MAX_DEPTH = 5
const DETAIL_PANEL_DEFAULT_WIDTH = 460
const DETAIL_PANEL_MIN_WIDTH = 440
const DETAIL_PANEL_MAX_WIDTH = 720

const SUBTASK_CREATE_FLOATING_SELECTOR = [
  '.ant-popover',
  '.ant-select-dropdown',
  '.ant-picker-dropdown',
].join(',')

const TASK_DETAIL_FLOATING_SELECTOR = [
  '.ant-popover',
  '.ant-dropdown',
  '.ant-select-dropdown',
  '.ant-picker-dropdown',
  '.ant-modal-root',
  '.task-rich-input-overlay',
].join(',')

function isSubtaskCreateFloatingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(SUBTASK_CREATE_FLOATING_SELECTOR))
}

function isTaskDetailFloatingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(TASK_DETAIL_FLOATING_SELECTOR))
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function formatParentTaskPathSegment(parentTask: Task): string {
  const summary = parentTask.summary.trim() || '未命名任务'
  // 父链按“父任务/子任务/”展示，斜杠放在每级末尾，避免一级子任务显示成“/父任务”。
  return `${summary}/`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function getUserDisplayName(user: { id: string; name?: string | null }): string {
  const name = user.name?.trim()
  if (name) {
    return name
  }
  return user.id || '未知用户'
}

function normalizeAvatarSrc(avatar?: string | null): string | undefined {
  if (typeof avatar !== 'string') {
    return undefined
  }
  const trimmed = avatar.trim()
  return trimmed || undefined
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderUserAvatar(
  user: { id: string; name?: string | null; avatar?: string | null },
  options: {
    size: number
    style?: CSSProperties
    className?: string
    icon?: ReactNode
  },
): ReactNode {
  const avatarSrc = normalizeAvatarSrc(user.avatar)
  const fallback = options.icon ?? (getUserDisplayName(user).slice(0, 1).toUpperCase() || 'U')
  return (
    <Avatar
      size={options.size}
      style={options.style}
      className={options.className}
      src={avatarSrc}
    >
      {avatarSrc ? null : fallback}
    </Avatar>
  )
}

function normalizeActivityValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '空'
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeActivityValue(item)).join('、') || '空'
  }
  if (typeof value === 'string') {
    const withoutTags = value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return withoutTags || '空'
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

function formatActivityFieldName(field: unknown): string {
  if (!isNonEmptyString(field)) {
    return '字段'
  }
  const fieldLabelMap: Record<string, string> = {
    title: '任务标题',
    description: '任务描述',
    status: '状态',
    priority: '优先级',
    assignee_id: '负责人',
    assignee_ids: '负责人',
    participant_ids: '关注人',
    follower_ids: '关注人',
    start_date: '开始时间',
    due_date: '截止时间',
    section_id: '任务分组',
  }
  return fieldLabelMap[field] ?? field
}

function formatTaskActivityText(activity: ApiTaskActivity): string {
  const { event_type: eventType, actor_id: actorId, payload } = activity
  const actorName = actorId || '有人'
  const taskTitle = isNonEmptyString(payload.task_title)
    ? payload.task_title.trim()
    : '该任务'

  switch (eventType) {
    case 'task.created':
      return `${actorName} 创建了任务 ${taskTitle}`
    case 'task.completed':
      return `${actorName} 完成了整个任务`
    case 'task.status_changed':
      return `${actorName} 将任务状态修改为 ${normalizeActivityValue(payload.new_value)}`
    case 'task.title_changed':
      return `${actorName} 将任务标题修改为 ${normalizeActivityValue(payload.new_value)}`
    case 'task.description_changed':
      return `${actorName} 将任务描述修改为：${normalizeActivityValue(payload.new_value)}`
    case 'task.start_date_changed':
      return `${actorName} 将开始时间修改为：${normalizeActivityValue(payload.new_value)}`
    case 'task.due_date_changed':
      return `${actorName} 将截止时间修改为：${normalizeActivityValue(payload.new_value)}`
    case 'task.assignee_changed': {
      const added = normalizeActivityValue(payload.added_assignee_ids)
      const removed = normalizeActivityValue(payload.removed_assignee_ids)
      if (added !== '空' && removed !== '空') {
        return `${actorName} 新增负责人 ${added}，移除负责人 ${removed}`
      }
      if (added !== '空') {
        return `${actorName} 添加负责人 ${added}`
      }
      if (removed !== '空') {
        return `${actorName} 移除负责人 ${removed}`
      }
      return `${actorName} 修改了负责人`
    }
    case 'task.participants_added':
      return `${actorName} 添加关注人 ${normalizeActivityValue(payload.target_user_ids)}`
    case 'task.participants_removed':
      return `${actorName} 移除关注人 ${normalizeActivityValue(payload.target_user_ids)}`
    case 'task.custom_field_changed':
      return `${actorName} 将“${formatActivityFieldName(payload.field_name)}”的字段值修改为：${normalizeActivityValue(payload.new_value)}`
    case 'comment.created':
      return `${actorName} 发表了评论：${normalizeActivityValue(payload.comment_excerpt)}`
    case 'comment.updated':
      return `${actorName} 编辑了评论：${normalizeActivityValue(payload.comment_excerpt)}`
    case 'comment.deleted':
      return `${actorName} 删除了评论`
    case 'attachment.created':
    case 'attachment.uploaded':
      return `${actorName} 上传了附件：${normalizeActivityValue(payload.file_name)}`
    case 'attachment.deleted':
      return `${actorName} 移除了附件：${normalizeActivityValue(payload.file_name)}`
    default:
      if (payload.field) {
        return `${actorName} 将“${formatActivityFieldName(payload.field)}”修改为：${normalizeActivityValue(payload.new_value)}`
      }
      return `${actorName} 更新了任务`
  }
}

function formatActivityDateLabel(date: dayjs.Dayjs): string {
  const now = dayjs()
  if (date.isSame(now, 'day')) {
    return '今天'
  }
  if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天'
  }
  const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdayMap[date.day()]
}

function groupTaskActivitiesByDate(activities: ApiTaskActivity[]): Array<{
  key: string
  label: string
  day: string
  items: ApiTaskActivity[]
}> {
  const groups = new Map<string, ApiTaskActivity[]>()
  for (const activity of activities) {
    const date = dayjs(activity.created_at)
    const key = date.format('YYYY-MM-DD')
    const current = groups.get(key) ?? []
    current.push(activity)
    groups.set(key, current)
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const date = dayjs(key)
    return {
      key,
      label: formatActivityDateLabel(date),
      day: date.format('D'),
      items,
    }
  })
}

function formatTaskStatusLabel(status: unknown): string {
  switch (status) {
    case 'todo':
      return '待处理'
    case 'in_progress':
      return '进行中'
    case 'done':
      return '已完成'
    case 'cancelled':
      return '已取消'
    default:
      return normalizeActivityValue(status)
  }
}

function formatReadableHistorySize(rawSize: unknown): string | null {
  const size = typeof rawSize === 'string' ? Number(rawSize) : rawSize
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return null
  }
  if (size < 1024) {
    return `${Math.max(1, Math.round(size))}B`
  }
  if (size < 1024 * 1024) {
    const value = size / 1024
    return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}KB`
  }
  return `${(size / 1024 / 1024).toFixed(2)}MB`
}

function normalizeHistoryPeople(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => isNonEmptyString(item))
  }
  if (isNonEmptyString(value)) {
    return [value]
  }
  return []
}

function renderHistoryPersonList(
  value: unknown,
  getUserLabel: (userId: string) => string,
): ReactNode {
  const people = normalizeHistoryPeople(value)
  if (people.length === 0) {
    return <span className="detail-history-empty-value">空</span>
  }

  return people.map((person, index) => (
    <span key={`${person}-${index}`}>
      {index > 0 && '、'}
      <span className="detail-history-person-highlight">{getUserLabel(person)}</span>
    </span>
  ))
}

function renderHistoryValue(value: unknown): ReactNode {
  return <span className="detail-history-value">{normalizeActivityValue(value)}</span>
}

function renderTaskActivityMessage(
  activity: ApiTaskActivity,
  getUserLabel: (userId: string) => string,
): ReactNode {
  const { event_type: eventType, actor_id: actorId, payload } = activity
  const actorLabel = getUserLabel(actorId)
  const fieldName = isNonEmptyString(payload.field_name)
    ? payload.field_name.trim()
    : isNonEmptyString(payload.field)
      ? formatActivityFieldName(payload.field)
      : '字段'
  const subtaskTitle = [
    payload.subtask_title,
    payload.child_task_title,
    payload.task_title,
    payload.title,
  ].find(isNonEmptyString)

  switch (eventType) {
    case 'task.created':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>创建了任务</span>
        </>
      )
    case 'task.completed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>完成了整个任务</span>
        </>
      )
    case 'task.status_changed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将“状态”的字段值修改为：</span>
          {renderHistoryValue(formatTaskStatusLabel(payload.new_value))}
        </>
      )
    case 'task.title_changed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将“标题”的字段值修改为：</span>
          {renderHistoryValue(payload.new_value)}
        </>
      )
    case 'task.description_changed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将“任务描述”的字段值修改为：</span>
          {renderHistoryValue(payload.new_value)}
        </>
      )
    case 'task.start_date_changed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将“开始时间”的字段值修改为：</span>
          {renderHistoryValue(payload.new_value)}
        </>
      )
    case 'task.due_date_changed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将“截止时间”的字段值修改为：</span>
          {renderHistoryValue(payload.new_value)}
        </>
      )
    case 'task.assignee_changed': {
      const added = normalizeHistoryPeople(payload.added_assignee_ids)
      const removed = normalizeHistoryPeople(payload.removed_assignee_ids)
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          {added.length > 0 ? (
            <>
              <span>将</span>
              {renderHistoryPersonList(added, getUserLabel)}
              <span>添加为任务负责人</span>
            </>
          ) : null}
          {added.length === 0 && removed.length > 0 ? (
            <>
              <span>移除了</span>
              {renderHistoryPersonList(removed, getUserLabel)}
              <span>的任务负责人</span>
            </>
          ) : null}
          {added.length === 0 && removed.length === 0 ? <span>修改了负责人</span> : null}
        </>
      )
    }
    case 'task.participants_added':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将</span>
          {renderHistoryPersonList(payload.target_user_ids, getUserLabel)}
          <span>添加为关注人</span>
        </>
      )
    case 'task.participants_removed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>移除了</span>
          {renderHistoryPersonList(payload.target_user_ids, getUserLabel)}
          <span>关注人</span>
        </>
      )
    case 'task.custom_field_changed':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>将“{fieldName}”的字段值修改为：</span>
          {renderHistoryValue(payload.new_value)}
        </>
      )
    case 'comment.created':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>发表了评论：</span>
          {renderHistoryValue(payload.comment_excerpt)}
        </>
      )
    case 'comment.updated':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>编辑了评论：</span>
          {renderHistoryValue(payload.comment_excerpt)}
        </>
      )
    case 'comment.deleted':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>删除了评论</span>
        </>
      )
    case 'attachment.created':
    case 'attachment.uploaded':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>上传了附件：</span>
        </>
      )
    case 'attachment.deleted':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>删除了附件：</span>
          {renderHistoryValue(payload.file_name)}
        </>
      )
    case 'task.subtask_added':
    case 'task.subtask_created':
    case 'subtask.created':
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>添加了子任务</span>
          {subtaskTitle ? (
            <>
              <span> </span>
              <span className="detail-history-task-link">{subtaskTitle}</span>
            </>
          ) : null}
        </>
      )
    default:
      if (payload.field) {
        return (
          <>
            <span className="detail-history-person-highlight">{actorLabel}</span>
            <span>将“{formatActivityFieldName(payload.field)}”修改为：</span>
            {renderHistoryValue(payload.new_value)}
          </>
        )
      }
      return (
        <>
          <span className="detail-history-person-highlight">{actorLabel}</span>
          <span>更新了任务</span>
        </>
      )
  }
}

function extractActivityAttachmentInfo(activity: ApiTaskActivity): {
  name: string
  sizeLabel: string | null
} | null {
  const payload = activity.payload as Record<string, unknown>
  const rawName = [
    payload.file_name,
    payload.attachment_name,
    payload.name,
    payload.filename,
    payload.title,
  ].find(isNonEmptyString)
  const rawSize = payload.file_size ?? payload.attachment_size ?? payload.size
  const sizeLabel = formatReadableHistorySize(rawSize)
  if (!rawName && !sizeLabel) {
    return null
  }
  return {
    name: rawName ?? '附件',
    sizeLabel,
  }
}

function renderActivityAttachmentCard(activity: ApiTaskActivity): ReactNode {
  const attachmentInfo = extractActivityAttachmentInfo(activity)
  if (!attachmentInfo) {
    return null
  }

  return (
    <div className="detail-history-attachment-card">
      <div className="detail-history-attachment-icon">
        <PaperClipOutlined />
      </div>
      <div className="detail-history-attachment-body">
        <div className="detail-history-attachment-name" title={attachmentInfo.name}>
          {attachmentInfo.name}
        </div>
        {attachmentInfo.sizeLabel && (
          <div className="detail-history-attachment-size">{attachmentInfo.sizeLabel}</div>
        )}
      </div>
    </div>
  )
}

interface TaskDetailPanelProps {
  task: Task
  tasklists: Tasklist[]
  onRefresh?: () => void
  onTaskUpdated?: (task: Task) => void
  onSubtaskCreated?: (task: Task) => void
  onTaskDeleted?: (taskGuid: string) => void
  onOpenTask?: (task: Task) => void
  onClose: () => void
}

export default function TaskDetailPanel({
  task,
  tasklists,
  onRefresh,
  onTaskUpdated,
  onSubtaskCreated,
  onTaskDeleted,
  onOpenTask,
  onClose,
}: TaskDetailPanelProps) {
  const [panelWidth, setPanelWidth] = useState(DETAIL_PANEL_DEFAULT_WIDTH)
  const [sectionPopoverOpen, setSectionPopoverOpen] = useState(false)
  const [sectionSearchValue, setSectionSearchValue] = useState('')
  const [commentValue, setCommentValue] = useState('')
  const [commentMentions, setCommentMentions] = useState<string[]>([])
  const [commentFocusVersion, setCommentFocusVersion] = useState(0)
  const [comments, setComments] = useState<ApiComment[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentValue, setEditingCommentValue] = useState('')
  const [editingCommentMentions, setEditingCommentMentions] = useState<string[]>([])
  const [descriptionDraft, setDescriptionDraft] = useState(task.description)
  const [descriptionEditing, setDescriptionEditing] = useState(false)
  const [subtaskDrafts, setSubtaskDrafts] = useState<Task[]>([])
  const [subtaskCreating, setSubtaskCreating] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [subtaskAssigneeIds, setSubtaskAssigneeIds] = useState<string[]>([])
  const [subtaskDue, setSubtaskDue] = useState<dayjs.Dayjs | null>(null)
  const [parentTaskChain, setParentTaskChain] = useState<Task[]>([])
  const [detailTasklistSections, setDetailTasklistSections] = useState<Section[]>([])
  const [detailTasklistSectionsLoading, setDetailTasklistSectionsLoading] = useState(false)
  const [activeSubtaskDueGuid, setActiveSubtaskDueGuid] = useState<string | null>(null)
  const [activeSubtaskAssigneeGuid, setActiveSubtaskAssigneeGuid] = useState<string | null>(null)
  const [selectedFollowerId, setSelectedFollowerId] = useState<string>()
  const [followersPopoverOpen, setFollowersPopoverOpen] = useState(false)
  const subtaskCreateRowRef = useRef<HTMLDivElement | null>(null)
  const subtaskInteractingRef = useRef(false)
  const subtaskSubmittingRef = useRef(false)
  const detailScrollRef = useRef<HTMLDivElement | null>(null)
  const pendingCommentScrollRef = useRef(false)
  const [, setAttachmentCount] = useState(0)
  const [attachments, setAttachments] = useState<ApiAttachment[]>([])
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [commentAttachments, setCommentAttachments] = useState<ApiAttachment[]>([])
  const [commentAttachmentOrigins, setCommentAttachmentOrigins] = useState<
    Record<string, TaskRichAttachmentSource>
  >({})
  const [commentAttachmentUploading, setCommentAttachmentUploading] = useState(false)
  const [commentAttachmentMap, setCommentAttachmentMap] = useState<
    Record<string, ApiAttachment>
  >({})
  const [previewAttachment, setPreviewAttachment] = useState<ApiAttachment | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string>()
  const [tasklistRenaming, setTasklistRenaming] = useState(false)
  const [tasklistRenameValue, setTasklistRenameValue] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyActivities, setHistoryActivities] = useState<ApiTaskActivity[]>([])
  const detailPanelRef = useRef<HTMLDivElement | null>(null)
  const resizeStateRef = useRef<{ dragging: boolean; startX: number; startWidth: number }>({
    dragging: false,
    startX: 0,
    startWidth: DETAIL_PANEL_DEFAULT_WIDTH,
  })
  const assignees = task.members.filter((m) => m.role === 'assignee')
  const isSubtask = Boolean(task.parent_task_guid)
  const creator: User = {
    id: task.creator.id,
    name: task.creator.name ?? task.creator.id,
    avatar: task.creator.avatar,
  }
  // 任务分组直接跟随当前任务自身的 tasklists，父任务链只负责路径展示。
  const primaryTasklistRef = task.tasklists[0]
  const creatorName = getUserDisplayName(creator)
  const currentTasklist = primaryTasklistRef
    ? tasklists.find((item) => item.guid === primaryTasklistRef.tasklist_guid)
    : undefined
  const currentTasklistRefs = task.tasklists.filter(
    (item) => item.tasklist_guid === currentTasklist?.guid,
  )
  const tasklistSectionSource = detailTasklistSections
  const primaryCurrentTasklistRef = currentTasklistRefs[0] ?? primaryTasklistRef
  const currentSection = tasklistSectionSource.find(
    (item) => item.guid === primaryCurrentTasklistRef?.section_guid,
  )
  const filteredTasklistSections = tasklistSectionSource.filter((item) => {
    const keyword = sectionSearchValue.trim().toLowerCase()
    const matchedKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const alreadyAdded = currentTasklistRefs.some((ref) => ref.section_guid === item.guid)
    return matchedKeyword && !alreadyAdded
  })
  const currentTasklistSections = currentTasklistRefs
    .map((item) => tasklistSectionSource.find((section) => section.guid === item.section_guid))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const primarySectionGuid = currentSection?.guid ?? tasklistSectionSource[0]?.guid ?? ''
  const historyActivityGroups = groupTaskActivitiesByDate(historyActivities)
  const resolveHistoryUserLabel = (userId: string): string => {
    if (!userId) {
      return '有人'
    }
    if (userId === appConfig.user_id) {
      return '我'
    }
    return getUserDisplayName(resolveTaskUserById(userId))
  }

  useLayoutEffect(() => {
    // 切换任务时，抽屉本身不重挂载，所以这里手动清理任务级状态，避免上一条任务的评论草稿、历史页和预览态残留到下一条。
    setSectionPopoverOpen(false)
    setSectionSearchValue('')
    setCommentValue('')
    setCommentMentions([])
    setEditingCommentId(null)
    setEditingCommentValue('')
    setEditingCommentMentions([])
    setComments([])
    setCommentAttachments([])
    setCommentAttachmentOrigins({})
    setCommentAttachmentMap({})
    setAttachments([])
    setAttachmentCount(0)
    setAttachmentUploading(false)
    setCommentAttachmentUploading(false)
    setDescriptionDraft(task.description)
    setDescriptionEditing(false)
    setSubtaskDrafts([])
    setSubtaskCreating(false)
    setSubtaskTitle('')
    setSubtaskAssigneeIds([])
    setSubtaskDue(null)
    setParentTaskChain([])
    setDetailTasklistSections([])
    // 切换到新任务时，当前清单分组要重新拉取；这里先进入加载态，避免同清单切换时闪出“选择分组”。
    setDetailTasklistSectionsLoading(Boolean(task.tasklists[0]?.tasklist_guid))
    setActiveSubtaskDueGuid(null)
    setActiveSubtaskAssigneeGuid(null)
    setSelectedFollowerId(undefined)
    setFollowersPopoverOpen(false)
    setPreviewAttachment(null)
    setTasklistRenaming(false)
    setTasklistRenameValue('')
    setHistoryOpen(false)
    setHistoryLoading(false)
    setHistoryActivities([])
    pendingCommentScrollRef.current = false
    subtaskInteractingRef.current = false
    subtaskSubmittingRef.current = false
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTo({ top: 0 })
    }
  }, [task.guid])

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      const isInsideDetailPanel = detailPanelRef.current
        ? detailPanelRef.current.contains(target)
        : false
      if (isInsideDetailPanel || isTaskDetailFloatingTarget(target)) {
        return
      }

      // 详情抽屉没有遮罩，点击抽屉外的主页面空白区时复用统一关闭入口。
      onClose()
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }, [onClose])

  useEffect(() => {
    if (!currentTasklist) {
      setSectionPopoverOpen(false)
      setSectionSearchValue('')
      setDetailTasklistSections([])
      setDetailTasklistSectionsLoading(false)
    }
  }, [currentTasklist])

  useEffect(() => {
    if (!currentTasklist) {
      return undefined
    }

    let cancelled = false
    setDetailTasklistSectionsLoading(true)
    void listSections(currentTasklist.guid)
      .then((items) => {
        if (cancelled) return
        const sections: Section[] = items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            guid: item.section_id,
            name: item.name,
            sort_order: item.sort_order,
            is_default: item.is_default,
          }))
        setDetailTasklistSections(sections)
      })
      .catch(() => {
        if (!cancelled) {
          setDetailTasklistSections([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailTasklistSectionsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentTasklist, task.guid])

  useEffect(() => {
    if (!sectionPopoverOpen && sectionSearchValue) {
      setSectionSearchValue('')
    }
  }, [sectionPopoverOpen, sectionSearchValue])

  useEffect(() => {
    void listSubtasks(task.guid).then((items) =>
      setSubtaskDrafts(inheritParentStartForTasks(items.map((t) => apiTaskToTask(t)), task)),
    )
  }, [task.guid, task.start?.timestamp])

  useEffect(() => {
    setActiveSubtaskDueGuid(null)
    setActiveSubtaskAssigneeGuid(null)
  }, [task.guid])

  useEffect(() => {
    if (!task.parent_task_guid) {
      setParentTaskChain([])
      return undefined
    }

    let cancelled = false
    const loadParentTaskChain = async () => {
      const ancestors: Task[] = []
      const visitedTaskGuids = new Set<string>([task.guid])
      let parentTaskGuid = task.parent_task_guid
      let depth = 0

      // 父任务链路来自逐级父任务查询，限制深度和去重是为了避免异常数据形成死循环。
      while (parentTaskGuid && depth < PARENT_TASK_CHAIN_MAX_DEPTH) {
        if (visitedTaskGuids.has(parentTaskGuid)) {
          break
        }
        visitedTaskGuids.add(parentTaskGuid)
        const apiTask = await getTask(parentTaskGuid)
        const parentTask = apiTaskToTask(apiTask)
        ancestors.unshift(parentTask)
        parentTaskGuid = parentTask.parent_task_guid
        depth += 1
      }

      if (!cancelled) {
        setParentTaskChain(ancestors)
      }
    }

    void loadParentTaskChain().catch(() => {
      if (!cancelled) {
        setParentTaskChain([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [task.guid, task.parent_task_guid])

  useEffect(() => {
    let cancelled = false
    void getTask(task.guid)
      .then((api) => {
        if (cancelled) return
        const fresh = apiTaskToTask(api)
        const tasklistsChanged =
          fresh.tasklists.length !== task.tasklists.length ||
          fresh.tasklists.some((item, index) => {
            const current = task.tasklists[index]
            return (
              !current ||
              current.tasklist_guid !== item.tasklist_guid ||
              current.section_guid !== item.section_guid
            )
          })
        // 仅在 start/due/status/title 等关键字段有差异时回写，避免不必要的渲染
        if (
          fresh.start?.timestamp !== task.start?.timestamp ||
          fresh.due?.timestamp !== task.due?.timestamp ||
          fresh.status !== task.status ||
          fresh.summary !== task.summary ||
          tasklistsChanged
        ) {
          onTaskUpdated?.(fresh)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.guid])

  useEffect(() => {
    setDescriptionDraft(task.description)
  }, [task.description, task.guid])

  useEffect(() => {
    setDescriptionEditing(false)
  }, [task.guid])

  useEffect(() => {
    if (!historyOpen) {
      return undefined
    }

    let cancelled = false
    setHistoryLoading(true)
    void listTaskActivities(task.guid, 1, 100)
      .then((items) => {
        if (!cancelled) {
          setHistoryActivities(items)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryActivities([])
          message.error(getActionErrorMessage(err, '加载历史记录失败'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [historyOpen, task.guid])

  useEffect(() => {
    let cancelled = false
    void listAttachments(task.guid)
      .then((items) => {
        if (!cancelled) {
          setAttachments(items)
          setAttachmentCount(items.length)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments([])
          setAttachmentCount(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [task.guid])

  useEffect(() => {
    if (!pendingCommentScrollRef.current) return
    if (!detailScrollRef.current) return

    detailScrollRef.current.scrollTo({ top: detailScrollRef.current.scrollHeight, behavior: 'smooth' })
    pendingCommentScrollRef.current = false
  }, [comments])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeStateRef.current.dragging) {
        return
      }
      const delta = resizeStateRef.current.startX - event.clientX
      const nextWidth = resizeStateRef.current.startWidth + delta
      const boundedWidth = Math.min(
        DETAIL_PANEL_MAX_WIDTH,
        Math.max(DETAIL_PANEL_MIN_WIDTH, nextWidth),
      )
      setPanelWidth(boundedWidth)
    }

    const handlePointerUp = () => {
      resizeStateRef.current.dragging = false
      document.body.classList.remove('detail-panel-resizing')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.classList.remove('detail-panel-resizing')
    }
  }, [])

  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const commentInputUsers = availableUsers

  const resolveTaskUserById = (
    userId: string,
    fallback?: { name?: string | null; avatar?: string | null },
  ): User => {
    const matchedAvailableUser = availableUsers.find((user) => user.id === userId)
    const matchedTaskMember = task.members.find((member) => member.id === userId)
    const matchedCreator = task.creator.id === userId ? task.creator : undefined
    return {
      id: userId,
      name:
        fallback?.name?.trim() ||
        matchedTaskMember?.name?.trim() ||
        matchedAvailableUser?.name?.trim() ||
        matchedCreator?.name?.trim() ||
        userId,
      avatar:
        normalizeAvatarSrc(fallback?.avatar ?? matchedTaskMember?.avatar ?? matchedAvailableUser?.avatar ?? matchedCreator?.avatar),
    }
  }

  const resolveCommentAuthorUser = (comment: ApiComment): User => {
    const authorId = comment.author_id ?? comment.user_id ?? ''
    if (!authorId) {
      return { id: '', name: '未知用户' }
    }
    return resolveTaskUserById(authorId, {
      name: comment.author_name ?? null,
      avatar: comment.author_avatar_url ?? null,
    })
  }

  useEffect(() => {
    listMembers()
      .then((members) =>
        setAvailableUsers(
          members.map((member) => ({
            id: member.user_id,
            name: member.user_name ?? member.user_id,
            avatar: member.avatar_url ?? undefined,
          })),
        ),
      )
      .catch(() => {})
  }, [])

  const followedUserIds = Array.from(new Set([
    ...(task.participant_ids ?? []),
    ...task.members
      .filter((member) => member.role === 'follower')
      .map((member) => member.id),
  ]))
  const followedUserIdsKey = followedUserIds.join(',')
  const followedUsers = followedUserIds.map((userId) => resolveTaskUserById(userId))
  const visibleFollowedUsers = followedUsers.slice(0, 3)
  const availableFollowerUsers = availableUsers.filter((user) => !followedUserIds.includes(user.id))

  useEffect(() => {
    setSelectedFollowerId(undefined)
  }, [task.guid, followedUserIdsKey])

  const handleTaskPatch = async (
    patch: Partial<Task>,
    options?: { descriptionMentions?: string[] },
  ) => {
    const apiPatch: Record<string, unknown> = {}
    if (patch.summary !== undefined) apiPatch.title = patch.summary
    if (patch.description !== undefined) apiPatch.description = patch.description
    if (options?.descriptionMentions !== undefined) {
      apiPatch.description_mentions = options.descriptionMentions
    }
    if (patch.status !== undefined) apiPatch.status = patch.status
    if (patch.tasklists !== undefined) apiPatch.tasklists = patch.tasklists
    if (patch.start !== undefined)
      apiPatch.start_date = patch.start
        ? new Date(Number(patch.start.timestamp)).toISOString()
        : null
    if (patch.due !== undefined)
      apiPatch.due_date = patch.due
        ? new Date(Number(patch.due.timestamp)).toISOString()
        : null

    const apiTask = await updateTaskApi(task.guid, apiPatch)
    const nextTask = apiTaskToTask(apiTask)
    onTaskUpdated?.(nextTask)
    if (patch.description !== undefined) {
      setDescriptionEditing(false)
    }
    if (!onTaskUpdated) {
      onRefresh?.()
    }
  }

  const handleAssigneeChange = async (values: string[]) => {
    const nextAssigneeIds = Array.from(new Set(values.filter(Boolean)))
    const defaultParticipantIds = buildDefaultParticipantIds(task.creator.id, nextAssigneeIds)
    try {
      await patchTaskAssignee(task.guid, nextAssigneeIds)
      if (defaultParticipantIds.length > 0) {
        await addParticipants(task.guid, defaultParticipantIds)
      }
      const fresh = await getTask(task.guid)
      const nextTask = apiTaskToTask(fresh)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
    } catch (err) {
      message.error(getActionErrorMessage(err, '更新负责人失败'))
    }
  }

  const handleAddFollowers = async () => {
    const toAdd = selectedFollowerId && !followedUserIds.includes(selectedFollowerId)
      ? [selectedFollowerId]
      : []
    if (toAdd.length === 0) {
      setFollowersPopoverOpen(false)
      return
    }

    try {
      await addParticipants(task.guid, toAdd)
      const fresh = await getTask(task.guid)
      const nextTask = apiTaskToTask(fresh)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
      setSelectedFollowerId(undefined)
      message.success('已添加关注人')
    } catch (err) {
      message.error(getActionErrorMessage(err, '添加关注人失败'))
    }
  }

  const handleRemoveFollower = async (targetUserId: string) => {
    try {
      await removeParticipant(task.guid, targetUserId)
      const fresh = await getTask(task.guid)
      const nextTask = apiTaskToTask(fresh)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
      message.success('已移除关注人')
    } catch (err) {
      message.error(getActionErrorMessage(err, '移除关注人失败'))
    }
  }

  const handleToggleTaskStatus = async () => {
    try {
      const apiTask = await patchTaskStatus(task.guid, task.status === 'done' ? 'todo' : 'done')
      const nextTask = apiTaskToTask(apiTask)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
    } catch (err) {
      message.error(getActionErrorMessage(err, '状态更新失败'))
    }
  }

  const followerPopoverContent = (
    <div className="followers-popover">
      <Card
        className="followers-popover-card"
        variant="borderless"
      >
        <Space direction="vertical" size={12} className="followers-popover-body">
          <div className="followers-toolbar">
            <div className="followers-picker-inline">
              <UserSearchSelect
                className="followers-search"
                size="middle"
                placeholder="搜索并选择要新增的人"
                value={selectedFollowerId}
                onChange={(value) =>
                  setSelectedFollowerId(Array.isArray(value) ? value[0] : value)
                }
                users={availableFollowerUsers}
              />
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                disabled={!selectedFollowerId}
                onClick={() => void handleAddFollowers()}
              >
                添加
              </Button>
            </div>
          </div>
          <div className="followers-list-panel">
            <List
              className="followers-list"
              dataSource={followedUsers}
              locale={{ emptyText: '暂无关注的人' }}
              renderItem={(user) => (
                <List.Item
                  className="followers-list-item"
                  actions={[
                    <Button
                      key="remove"
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => void handleRemoveFollower(user.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={renderUserAvatar(user, {
                      size: 30,
                      style: { backgroundColor: '#7b67ee', color: '#fff' },
                    })}
                    title={<Text className="followers-user-name">{getUserDisplayName(user)}</Text>}
                  />
                </List.Item>
              )}
            />
          </div>
        </Space>
      </Card>
    </div>
  )

  // 关注人入口固定在负责人下面，避免 footer 再渲染一份导致详情页底部重复占位。
  const followersEntry = (
    <div className="detail-followers">
      <Button
        type="text"
        htmlType="button"
        className="followers-summary"
      >
        {visibleFollowedUsers.length > 0 ? (
          <Avatar.Group max={{ count: 3 }} size={24}>
            {visibleFollowedUsers.map((user) => (
              <Tooltip key={user.id} title={getUserDisplayName(user)}>
                {renderUserAvatar(user, {
                  size: 20,
                  style: { backgroundColor: '#7b67ee', color: '#fff' },
                })}
              </Tooltip>
            ))}
          </Avatar.Group>
        ) : (
          <Avatar size={20} style={{ backgroundColor: '#7b67ee' }} icon={<UserOutlined />} />
        )}
        <span className="followers-text">{followedUsers.length} 人关注</span>
        <span className="followers-summary-action">管理</span>
      </Button>
    </div>
  )

  const handleDateQuickSet = async (
    field: 'start' | 'due',
    value: dayjs.Dayjs | null,
  ) => {
    if (field === 'start' && isSubtask) {
      message.warning('子任务开始时间跟随父任务，不能单独修改')
      return
    }

    await handleTaskPatch({
      [field]: value
        ? { timestamp: value.valueOf().toString(), is_all_day: false }
        : undefined,
    })
  }

  const handleDateChange = handleDateQuickSet

  const MAX_DEPTH = 4 // 父任务 depth=0，最深子任务 depth=4，共 5 层
  const canCreateSubtask = (task.depth ?? 0) < MAX_DEPTH

  const cancelEmptySubtaskCreate = () => {
    setSubtaskCreating(false)
    resetSubtaskCreateDraft()
  }

  const resetSubtaskCreateDraft = () => {
    setSubtaskTitle('')
    setSubtaskAssigneeIds([])
    setSubtaskDue(null)
  }

  const handleAddSubtask = async () => {
    if (subtaskSubmittingRef.current) {
      return
    }
    const summary = subtaskTitle.trim()
    if (!summary) {
      setSubtaskCreating(true)
      return
    }
    if (!canCreateSubtask) {
      message.warning('子任务层级已达上限（共 5 层）')
      return
    }

    subtaskSubmittingRef.current = true
    // 开始时间默认继承父任务
    const parentStart = task.start?.timestamp
      ? new Date(Number(task.start.timestamp)).toISOString()
      : undefined
    try {
      const apiTask = await createTaskApi({
        project_id: primaryTasklistRef?.tasklist_guid ?? '',
        title: summary,
        parent_task_id: task.guid,
        section_id: primarySectionGuid || primaryTasklistRef?.section_guid,
        assignee_ids: subtaskAssigneeIds,
        start_date: parentStart,
        due_date: subtaskDue ? subtaskDue.toISOString() : undefined,
      })
      const defaultParticipantIds = buildDefaultParticipantIds(appConfig.user_id, subtaskAssigneeIds)
      if (defaultParticipantIds.length > 0) {
        await addParticipants(apiTask.task_id, defaultParticipantIds)
      }
      let createdTask = inheritParentStartForTasks([apiTaskToTask(apiTask)], task)[0]
      createdTask = applyParticipantIdsToTask(createdTask, [
        ...(createdTask.participant_ids ?? []),
        ...defaultParticipantIds,
      ])
      setSubtaskDrafts((prev) => [...prev, createdTask])
      resetSubtaskCreateDraft()
      setSubtaskCreating(true)
      onSubtaskCreated?.(createdTask)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建子任务失败')
    } finally {
      subtaskSubmittingRef.current = false
    }
  }

  const handleSubtaskSubmit = () => {
    if (!subtaskTitle.trim()) {
      cancelEmptySubtaskCreate()
      return
    }
    void handleAddSubtask()
  }

  useEffect(() => {
    if (!subtaskCreating) {
      return undefined
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target
      const row = subtaskCreateRowRef.current
      if (!row || !(target instanceof Node)) {
        return
      }
      if (row.contains(target) || isSubtaskCreateFloatingTarget(target)) {
        return
      }

      // 子任务创建支持点空白保存，但点日期、负责人浮层时不能误提交。
      handleSubtaskSubmit()
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }, [subtaskCreating, handleSubtaskSubmit])

  const markSubtaskCreateInteracting = () => {
    subtaskInteractingRef.current = true
  }

  const handleSubtaskCreateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (subtaskInteractingRef.current) {
      subtaskInteractingRef.current = false
      return
    }

    const next = e.relatedTarget as HTMLElement | null
    if (
      next &&
      (next.closest('.subtask-suffix-icons') ||
        isSubtaskCreateFloatingTarget(next))
    ) {
      return
    }

    if (!subtaskTitle.trim()) {
      cancelEmptySubtaskCreate()
      return
    }
    void handleAddSubtask()
  }

  const handleToggleSubtaskStatus = async (subtask: Task) => {
    const nextDone = subtask.status !== 'done'
    try {
      const apiTask = await patchTaskStatus(subtask.guid, nextDone ? 'done' : 'todo')
      const next = inheritParentStartForTasks([apiTaskToTask(apiTask)], task)[0]
      setSubtaskDrafts((prev) => prev.map((s) => (s.guid === subtask.guid ? next : s)))
      onTaskUpdated?.(next)
    } catch (err) {
      message.error(getActionErrorMessage(err, '状态更新失败'))
    }
  }

  const handleOpenSubtaskDetail = (subtask: Task) => {
    onOpenTask?.(subtask)
  }

  const handleOpenParentTask = (parentTask: Task) => {
    onOpenTask?.(parentTask)
  }

  const handleSubtaskDueChange = async (subtask: Task, value: dayjs.Dayjs | null) => {
    try {
      const apiTask = await updateTaskApi(subtask.guid, {
        due_date: value ? value.toISOString() : null,
      })
      const next = inheritParentStartForTasks([apiTaskToTask(apiTask)], task)[0]
      setSubtaskDrafts((prev) => prev.map((item) => (item.guid === subtask.guid ? next : item)))
      onTaskUpdated?.(next)
      setActiveSubtaskDueGuid(null)
      message.success(value ? '已更新子任务截止时间' : '已清空子任务截止时间')
    } catch (err) {
      message.error(getActionErrorMessage(err, '更新子任务截止时间失败'))
    }
  }

  const handleSubtaskAssigneeChange = async (subtask: Task, values: string[]) => {
    const nextAssigneeIds = Array.from(new Set(values.filter(Boolean)))
    const defaultParticipantIds = buildDefaultParticipantIds(subtask.creator.id, nextAssigneeIds)
    try {
      const apiTask = await patchTaskAssignee(subtask.guid, nextAssigneeIds)
      if (defaultParticipantIds.length > 0) {
        await addParticipants(subtask.guid, defaultParticipantIds)
      }
      const next = inheritParentStartForTasks([apiTaskToTask(apiTask)], task)[0]
      setSubtaskDrafts((prev) => prev.map((item) => (item.guid === subtask.guid ? next : item)))
      onTaskUpdated?.(next)
      setActiveSubtaskAssigneeGuid(null)
      message.success(nextAssigneeIds.length > 0 ? '已更新子任务负责人' : '已清空子任务负责人')
    } catch (err) {
      message.error(getActionErrorMessage(err, '更新子任务负责人失败'))
    }
  }

  const handleAttachmentUpload = async (file: File) => {
    setAttachmentUploading(true)
    try {
      const created = await uploadAttachment(task.guid, file)
      setAttachments((prev) => [...prev, created])
      setAttachmentCount((prev) => prev + 1)
      message.success('附件已上传')
      return created
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
      return null
    } finally {
      setAttachmentUploading(false)
    }
  }

  const handleCommentAttachmentUpload = async (file: File) => {
    setCommentAttachmentUploading(true)
    try {
      const created = await uploadAttachment(task.guid, file, { ownerType: 'comment' })
      setCommentAttachmentMap((prev) => ({ ...prev, [created.attachment_id]: created }))
      return created
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
      return null
    } finally {
      setCommentAttachmentUploading(false)
    }
  }

  const handleRemoveCommentAttachment = (attachmentId: string) => {
    setCommentAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId))
    setCommentAttachmentOrigins((prev) => {
      const next = { ...prev }
      delete next[attachmentId]
      return next
    })
  }

  const handleAttachmentDelete = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId)
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId))
      setAttachmentCount((prev) => Math.max(0, prev - 1))
      message.success('附件已删除')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleAttachmentDownload = async (att: ApiAttachment) => {
    try {
      await downloadAttachment(att.attachment_id, att.file_name)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '下载失败')
    }
  }

  const handleOpenAttachmentPreview = (attachment: ApiAttachment) => {
    setPreviewAttachment(attachment)
  }

  const handleAddTaskToSection = async (sectionGuid: string) => {
    if (!currentTasklist) {
      return
    }

    if (currentTasklistRefs.some((item) => item.section_guid === sectionGuid)) {
      setSectionSearchValue('')
      setSectionPopoverOpen(false)
      return
    }

    // 切换分组时先乐观更新本地状态，避免接口返回慢时页面看起来没有变化。
    const nextTasklists = [
      ...task.tasklists.filter((item) => item.tasklist_guid !== currentTasklist.guid),
      {
        tasklist_guid: currentTasklist.guid,
        section_guid: sectionGuid,
      },
    ]
    const nextTask: Task = {
      ...task,
      tasklists: nextTasklists,
    }

    try {
      onTaskUpdated?.(nextTask)
      await moveTaskToSection(task.guid, sectionGuid)
      setSectionSearchValue('')
      message.success('已切换任务分组')
      if (!onTaskUpdated) {
        onRefresh?.()
      }
    } catch (err) {
      onTaskUpdated?.(task)
      message.error(err instanceof Error ? err.message : '切换任务分组失败')
    }
  }

  const handleRemoveTaskFromSection = async (sectionGuid: string) => {
    if (!currentTasklist) {
      return
    }

    const nextTasklists = task.tasklists.filter(
      (item) =>
        item.tasklist_guid !== currentTasklist.guid || item.section_guid !== sectionGuid,
    )

    if (nextTasklists.length === task.tasklists.length) {
      return
    }

    try {
      await handleTaskPatch({
        tasklists: nextTasklists,
      })
      message.success('已移除任务分组')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移除任务分组失败')
    }
  }

  const handleRenameTasklistSubmit = async () => {
    if (!currentTasklist) return
    const nextName = tasklistRenameValue.trim()
    if (!nextName || nextName === currentTasklist.name) {
      setTasklistRenaming(false)
      return
    }
    try {
      await apiUpdateProject(currentTasklist.guid, { name: nextName })
      message.success('已重命名清单')
      setTasklistRenaming(false)
      onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '重命名清单失败')
    }
  }

  useEffect(() => {
    let cancelled = false
    void listComments(task.guid)
      .then((items) => {
        if (!cancelled) setComments(items)
      })
      .catch(() => {
        if (!cancelled) setComments([])
      })
    return () => {
      cancelled = true
    }
  }, [task.guid])

  useEffect(() => {
    const ids = new Set<string>()
    comments.forEach((c) => {
      ;(c.attachment_ids ?? []).forEach((id) => {
        if (id && !commentAttachmentMap[id]) ids.add(id)
      })
    })
    if (ids.size === 0) return
    let cancelled = false
    void Promise.all(
      Array.from(ids).map((id) =>
        getAttachment(id)
          .then((att) => [id, att] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, ApiAttachment> = {}
      results.forEach((r) => {
        if (r) next[r[0]] = r[1]
      })
      if (Object.keys(next).length > 0) {
        setCommentAttachmentMap((prev) => ({ ...prev, ...next }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [comments, commentAttachmentMap])

  useEffect(() => {
    if (!previewAttachment) {
      setPreviewContent('')
      setPreviewLoading(false)
      setPreviewImageUrl(undefined)
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null
    setPreviewLoading(true)
    setPreviewContent('')
    setPreviewImageUrl(undefined)

    fetch(buildAttachmentPreviewUrl(previewAttachment), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`预览失败 (${response.status})`)
        }

        if (isImageAttachment(previewAttachment)) {
          const blob = await response.blob()
          objectUrl = URL.createObjectURL(blob)
          setPreviewImageUrl(objectUrl)
          return
        }

        const text = await response.text()
        setPreviewContent(text)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        message.error(error instanceof Error ? error.message : '预览失败')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPreviewLoading(false)
        }
      })

    return () => {
      controller.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [previewAttachment])

  const handleSendComment = async (contentOverride?: string, mentionIds?: string[]) => {
    const content = (contentOverride ?? commentValue).trim()
    const nextMentions = mentionIds ?? commentMentions
    if (!content && commentAttachments.length === 0) {
      return
    }
    try {
      const attachmentIds = commentAttachments.map((a) => a.attachment_id)
      const created = await createComment(
        task.guid,
        content,
        nextMentions.length > 0 ? nextMentions : undefined,
        attachmentIds.length > 0 ? attachmentIds : undefined,
      )
      pendingCommentScrollRef.current = true
      setComments((prev) => [...prev, created])
      setCommentValue('')
      setCommentMentions([])
      setCommentAttachments([])
      setCommentAttachmentOrigins({})
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发送失败')
    }
  }

  const handleStartEditComment = (c: ApiComment) => {
    setEditingCommentId(c.comment_id)
    setEditingCommentValue(c.content)
    setEditingCommentMentions(c.mentions ?? [])
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(task.guid, commentId)
      setComments((prev) => prev.filter((c) => c.comment_id !== commentId))
      message.success('评论已删除')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleReplyComment = (comment: ApiComment) => {
    const authorUser = resolveCommentAuthorUser(comment)
    const targetUserId = authorUser.id
    if (!targetUserId) return

    const mentionHtml = `<span class="task-rich-input-mention" data-mention-id="${targetUserId}" contenteditable="false">@${escapeHtml(getUserDisplayName(authorUser))}</span>&nbsp;`

    setCommentMentions((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]))
    setCommentValue((prev) => {
      const nextValue = normalizeRichContent(prev)
      if (nextValue.includes(`data-mention-id="${targetUserId}"`)) {
        return nextValue
      }
      return `${nextValue}${mentionHtml}`
    })
    pendingCommentScrollRef.current = true
    setCommentFocusVersion((prev) => prev + 1)
  }

  const handleDeleteTask = async () => {
    await deleteTaskApi(task.guid)
    onTaskDeleted?.(task.guid)
    if (!onTaskDeleted) {
      onRefresh?.()
    }
    message.success('已删除任务')
    onClose()
  }

  const moreMenu = {
    items: [
      { key: 'history', icon: <HistoryOutlined />, label: '查看历史记录' },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'history') {
        setHistoryOpen(true)
        return
      }
      if (key === 'delete') {
        void handleDeleteTask()
      }
    },
  }




  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeStateRef.current = {
      dragging: true,
      startX: event.clientX,
      startWidth: panelWidth,
    }
    document.body.classList.add('detail-panel-resizing')
  }

  if (historyOpen) {
    return (
      <div
        className="detail-panel detail-panel--drawer"
        ref={detailPanelRef}
        style={{ width: panelWidth, minWidth: panelWidth }}
      >
        <div
          className="detail-resize-handle"
          onPointerDown={handleResizeStart}
        />
        <div className="detail-history-panel">
          <div className="detail-history-header">
            <Tooltip title="返回详情" placement="bottom">
              <Button
                type="text"
                size="small"
                className="detail-history-back"
                icon={<LeftOutlined />}
                onClick={() => setHistoryOpen(false)}
              />
            </Tooltip>
            <div className="detail-history-title">历史记录</div>
            <Tooltip title="关闭详情" placement="bottom">
              <Button
                type="text"
                size="small"
                className="detail-history-close"
                icon={<CloseOutlined />}
                onClick={onClose}
              />
            </Tooltip>
          </div>

          <div className="detail-history-content">
            {historyLoading ? (
              <div className="detail-history-loading">
                <Spin size="small" />
              </div>
            ) : historyActivityGroups.length === 0 ? (
              <div className="detail-history-empty">
                <Empty description="暂无历史记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              historyActivityGroups.map((group) => (
                <section key={group.key} className="detail-history-group">
                  <div className="detail-history-date">
                    <span className="detail-history-date-label">{group.label}</span>
                    <span className="detail-history-date-day">{group.day}</span>
                  </div>
                  <div className="detail-history-list">
                    {group.items.map((activity) => (
                      <div key={activity.activity_id} className="detail-history-item">
                        {(() => {
                          const activityText = formatTaskActivityText(activity)
                          return (
                            <>
                        <div className="detail-history-time">
                          {dayjs(activity.created_at).format('HH:mm')}
                        </div>
                        {renderUserAvatar(resolveTaskUserById(activity.actor_id), {
                          size: 20,
                          className: 'detail-history-avatar',
                          style: { backgroundColor: '#7b67ee', color: '#fff' },
                        })}
                        <div className="detail-history-message" title={activityText}>
                          <div className="detail-history-message-line">
                            {renderTaskActivityMessage(activity, resolveHistoryUserLabel)}
                          </div>
                          {extractActivityAttachmentInfo(activity) && (
                            <div className="detail-history-attachment-wrap">
                              {renderActivityAttachmentCard(activity)}
                            </div>
                          )}
                        </div>
                            </>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="detail-panel detail-panel--drawer"
      ref={detailPanelRef}
      style={{ width: panelWidth, minWidth: panelWidth }}
    >
      <div
        className="detail-resize-handle"
        onPointerDown={handleResizeStart}
      />
      {/* Header */}
      <div className="detail-top">
        <div className="detail-actions">
          <Dropdown menu={moreMenu} trigger={['click']} placement="bottomLeft">
            <span className="detail-action-icon">
              <MoreOutlined />
            </span>
          </Dropdown>
          <Tooltip title="关闭详情" placement="bottom">
            <span className="detail-action-icon" onClick={onClose}>
              <CloseOutlined />
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Scrollable body + comments */}
      <div className="detail-scroll" ref={detailScrollRef}>
        <div className="detail-body">
          {isSubtask && parentTaskChain.length > 0 && (
            <Breadcrumb
              className="detail-parent-chain"
              separator=""
              items={parentTaskChain.map((parentTask) => ({
                key: parentTask.guid,
                title: (
                  <button
                    type="button"
                    className="detail-parent-chain-link"
                    onClick={() => handleOpenParentTask(parentTask)}
                  >
                    {formatParentTaskPathSegment(parentTask)}
                  </button>
                ),
              }))}
            />
          )}

          {/* Title */}
          <div className={`detail-title-row ${task.status === 'done' ? 'is-done' : ''}`}>
            <Tooltip
              title={task.status === 'done' ? '标记未完成' : '标记已完成'}
              placement="top"
              color="#000"
              overlayInnerStyle={{ color: '#fff' }}
            >
              <Checkbox
                className="detail-title-checkbox"
                checked={task.status === 'done'}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={() => {
                  void handleToggleTaskStatus()
                }}
              />
            </Tooltip>
            <div className="detail-title">{task.summary}</div>
          </div>

          {/* Assignee row */}
          <div className="detail-field-row">
            <Tooltip title="负责人" placement="top">
              <UserOutlined className="field-icon" />
            </Tooltip>
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={
                <div className="detail-popover-panel">
                  <Text strong>添加负责人</Text>
                  <UserSearchSelect
                    mode="multiple"
                    size="small"
                    value={assignees.map((member) => member.id)}
                    onChange={(value) => void handleAssigneeChange(Array.isArray(value) ? value : [])}
                    users={availableUsers}
                    placeholder="搜索并选择负责人"
                  />
                </div>
              }
            >
              <div className="field-content field-clickable">
              {assignees.length > 0 ? (
                <Avatar.Group size={16} max={{ count: 4 }}>
                  {assignees.map((a) => (
                    <Tooltip key={a.id} title={getUserDisplayName(a)}>
                      {renderUserAvatar(a, {
                        size: 16,
                        style: { backgroundColor: '#7b67ee', fontSize: 10, color: '#fff' },
                      })}
                    </Tooltip>
                  ))}
                </Avatar.Group>
              ) : (
                  <span className="field-placeholder">添加负责人</span>
                )}
              </div>
            </Popover>
          </div>

          {/* Followers row */}
          <div className="detail-field-row detail-followers-row">
            <Tooltip title="关注人" placement="top">
              <UsergroupAddOutlined className="field-icon" />
            </Tooltip>
            <div className="field-content">
              <Popover
                open={followersPopoverOpen}
                onOpenChange={setFollowersPopoverOpen}
                placement="bottomLeft"
                trigger="click"
                content={followerPopoverContent}
                overlayClassName="followers-popover-overlay"
              >
                {followersEntry}
              </Popover>
            </div>
          </div>

          {/* Date row */}
          <div className="detail-field-row">
            <Tooltip title="开始和截止时间" placement="top">
              <CalendarOutlined className="field-icon" />
            </Tooltip>
            <div className="field-content">
              <Popover
                trigger="click"
                placement="bottomLeft"
                content={
                  <div style={{ width: 280 }} onMouseDown={(e) => e.preventDefault()}>
                    <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 13 }}>开始时间</div>
                    {isSubtask ? (
                      <div style={{ color: '#8f959e', fontSize: 13, marginBottom: 8 }}>
                        子任务开始时间跟随父任务，不能单独修改
                      </div>
                    ) : (
                      <>
                        <Calendar
                          fullscreen={false}
                          value={
                            task.start
                              ? dayjs(Number(task.start.timestamp))
                              : undefined
                          }
                          onSelect={(value) => void handleDateChange('start', value)}
                        />
                        {task.start && (
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
                      </>
                    )}
                    <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 500, fontSize: 13 }}>截止时间</div>
                    <Calendar
                      fullscreen={false}
                      value={
                        task.due
                          ? dayjs(Number(task.due.timestamp))
                          : undefined
                      }
                      onSelect={(value) => void handleDateChange('due', value)}
                      disabledDate={(current) =>
                        current && current < dayjs().startOf('day')
                      }
                    />
                    {task.due && (
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
                <span className="date-range-text">
                  {task.start && task.due
                    ? `${dayjs(Number(task.start.timestamp)).format('M月D日')} – ${dayjs(Number(task.due.timestamp)).format('M月D日')}`
                    : task.start
                      ? dayjs(Number(task.start.timestamp)).format('M月D日')
                      : task.due
                        ? dayjs(Number(task.due.timestamp)).format('M月D日')
                        : '设置日期'}
                </span>
              </Popover>
            </div>
          </div>

          {/* Tasklist row */}
          {currentTasklist && !isSubtask && (
            <>
              <div className="detail-field-row">
                <Tooltip title="任务清单和分组" placement="top">
                  <UnorderedListOutlined className="field-icon" />
                </Tooltip>
                <div className="field-content">
                  <span className="tasklist-info">
                    {tasklistRenaming ? (
                      <Input
                        size="small"
                        autoFocus
                        value={tasklistRenameValue}
                        onChange={(e) => setTasklistRenameValue(e.target.value)}
                        onPressEnter={() => void handleRenameTasklistSubmit()}
                        onBlur={() => void handleRenameTasklistSubmit()}
                        style={{ maxWidth: 180 }}
                      />
                    ) : (
                      <span className="tasklist-name">
                        {currentTasklist.name}
                      </span>
                    )}
                    <span className="tasklist-divider">|</span>
                    <Popover
                      trigger="click"
                      placement="bottomLeft"
                      open={sectionPopoverOpen}
                      onOpenChange={setSectionPopoverOpen}
                      content={
                        <div className="detail-popover-panel tasklist-section-panel">
                          <div className="tasklist-section-panel-title">
                            <Text strong>已添加任务分组</Text>
                          </div>
                          <div className="tasklist-section-tags">
                            {detailTasklistSectionsLoading ? (
                              <span className="tasklist-section-empty">分组加载中</span>
                            ) : currentTasklistSections.length > 0 ? (
                              currentTasklistSections.map((item) => (
                                <span key={item.guid} className="tasklist-section-chip">
                                  <span className="tasklist-section-chip-name">{item.name}</span>
                                  <button
                                    type="button"
                                    className="tasklist-section-chip-remove"
                                    onClick={() => void handleRemoveTaskFromSection(item.guid)}
                                    disabled={currentTasklistSections.length === 1}
                                    title={
                                      currentTasklistSections.length === 1
                                        ? '至少保留一个任务分组'
                                        : '移除任务分组'
                                    }
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="tasklist-section-empty">当前还没有任务分组</span>
                            )}
                          </div>
                          <Input
                            size="small"
                            value={sectionSearchValue}
                            onChange={(e) => setSectionSearchValue(e.target.value)}
                            placeholder="搜索或新建任务清单"
                            className="tasklist-section-search"
                          />
                          <div className="tasklist-section-search-list">
                            {filteredTasklistSections.length > 0 ? (
                              filteredTasklistSections.map((item) => (
                                <button
                                  key={item.guid}
                                  type="button"
                                  className="tasklist-section-search-item"
                                  onClick={() => void handleAddTaskToSection(item.guid)}
                                >
                                  {item.name}
                                </button>
                              ))
                            ) : (
                              <div className="tasklist-section-search-empty">
                                没有匹配的任务分组
                              </div>
                            )}
                          </div>
                        </div>
                      }
                    >
                      <span className="tasklist-section-trigger">
                        {detailTasklistSectionsLoading
                          ? '分组加载中'
                          : currentTasklistSections.length > 0
                          ? currentTasklistSections.map((item) => item.name).join('、')
                          : '选择分组'}
                        <Tooltip title="选择任务分组">
                          <DownOutlined className="tasklist-arrow" />
                        </Tooltip>
                      </span>
                    </Popover>
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Description row */}
          <div className="detail-field-row">
            <Tooltip title="任务描述" placement="top">
              <AlignLeftOutlined className="field-icon" />
            </Tooltip>
            <div className="field-content detail-description-content">
              {descriptionEditing ? (
                <TaskRichInput
                  mode="description"
                  value={descriptionDraft}
                  users={commentInputUsers}
                  placeholder="输入任务描述"
                  className="detail-description-editor"
                  autoFocus
                  onChange={setDescriptionDraft}
                  onBlurCommit={async (nextValue) => {
                    // 描述区支持 @ 选人，保存时要把提及人一起传给后端，后端才能据此生成通知。
                    const next = nextValue.trim()
                    if (next !== (task.description ?? '')) {
                      await handleTaskPatch(
                        { description: next },
                        { descriptionMentions: [] },
                      )
                    } else {
                      setDescriptionEditing(false)
                    }
                  }}
                  onRequestAttachmentUpload={(file) => handleAttachmentUpload(file)}
                  onPreviewAttachment={handleOpenAttachmentPreview}
                  onDownloadAttachment={(attachment) => void handleAttachmentDownload(attachment)}
                  onRemoveAttachment={handleAttachmentDelete}
                />
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`detail-description-view ${!descriptionDraft.trim() ? 'is-empty' : ''}`}
                  onClick={(event) => {
                    const target = event.target
                    if (target instanceof Element && target.closest('a[href]')) {
                      return
                    }
                    setDescriptionEditing(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setDescriptionEditing(true)
                    }
                  }}
                >
                  {descriptionDraft.trim() ? (
                    <TaskRichText html={descriptionDraft} className="detail-description-text" />
                  ) : (
                    <span className="detail-description-placeholder">输入任务描述</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subtask row */}
          <div className="detail-field-row">
            <Tooltip title="子任务" placement="top">
              <BranchesOutlined className="field-icon" />
            </Tooltip>
            <div className="field-content">
              <span className="field-placeholder">子任务</span>
            </div>
          </div>
          <div className="detail-field-indent">
            <div className="detail-subtasks">
              {subtaskDrafts.map((subtask) => {
                const isDone = subtask.status === 'done'
                const assigneeUsers = subtask.members
                  .filter((m) => m.role === 'assignee')
                  .map((assignee) => availableUsers.find((user) => user.id === assignee.id) ?? {
                    id: assignee.id,
                    name: assignee.name ?? assignee.id,
                  })
                const dueDate = subtask.due ? dayjs(Number(subtask.due.timestamp)) : null
                return (
                  <div
                    key={subtask.guid}
                    className={`detail-subtask-row ${isDone ? 'is-done' : ''}`}
                  >
                    <Tooltip
                      title={isDone ? '标记未完成' : '标记已完成'}
                      placement="top"
                      color="#000"
                      overlayInnerStyle={{ color: '#fff' }}
                    >
                      <span
                        className={`subtask-check ${isDone ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleToggleSubtaskStatus(subtask)
                        }}
                      >
                        {isDone && <CheckOutlined />}
                      </span>
                    </Tooltip>
                    <button
                      type="button"
                      className="subtask-title-btn"
                      onClick={() => handleOpenSubtaskDetail(subtask)}
                    >
                      <span className="subtask-title">{subtask.summary}</span>
                    </button>
                    <div
                      className="subtask-meta"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Popover
                        trigger="click"
                        placement="bottomLeft"
                        open={activeSubtaskDueGuid === subtask.guid}
                        onOpenChange={(open) =>
                          setActiveSubtaskDueGuid(open ? subtask.guid : null)
                        }
                        content={
                          <div style={{ width: 260 }} onMouseDown={(e) => e.preventDefault()}>
                            <Calendar
                              fullscreen={false}
                              value={dueDate ?? undefined}
                              onSelect={(value) => void handleSubtaskDueChange(subtask, value)}
                              disabledDate={(current) =>
                                current && current < dayjs().startOf('day')
                              }
                            />
                            {dueDate && (
                              <div style={{ textAlign: 'right', padding: '4px 8px' }}>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => void handleSubtaskDueChange(subtask, null)}
                                >
                                  清除
                                </Button>
                              </div>
                            )}
                          </div>
                        }
                      >
                        <Tooltip title="设置子任务截止时间">
                          <Button
                            type="text"
                            size="small"
                            className="subtask-meta-trigger subtask-date-trigger"
                            icon={<CalendarOutlined />}
                          >
                            {dueDate ? dueDate.format('M月D日') : '截止时间'}
                          </Button>
                        </Tooltip>
                      </Popover>
                      <Popover
                        trigger="click"
                        placement="bottomLeft"
                        open={activeSubtaskAssigneeGuid === subtask.guid}
                        onOpenChange={(open) =>
                          setActiveSubtaskAssigneeGuid(open ? subtask.guid : null)
                        }
                        content={
                          <div style={{ width: 220 }}>
                            <UserSearchSelect
                              autoFocus
                              label="设置子任务负责人"
                              placeholder="搜索并选择负责人"
                              mode="multiple"
                              value={assigneeUsers.map((user) => user.id)}
                              onChange={(value) =>
                                void handleSubtaskAssigneeChange(
                                  subtask,
                                  Array.isArray(value) ? value : [],
                                )
                              }
                              users={availableUsers}
                            />
                          </div>
                        }
                      >
                        <Tooltip title="设置子任务负责人">
                          <Button
                            type="text"
                            size="small"
                            className="subtask-meta-trigger subtask-assignee-trigger"
                          >
                            {assigneeUsers.length > 0 ? (
                              <>
                                <Avatar.Group size={20} max={{ count: 3 }}>
                                  {assigneeUsers.map((assigneeUser) => (
                                    <Tooltip key={assigneeUser.id} title={getUserDisplayName(assigneeUser)}>
                                      {renderUserAvatar(assigneeUser, {
                                        size: 20,
                                        style: { backgroundColor: '#7b67ee', color: '#fff' },
                                      })}
                                    </Tooltip>
                                  ))}
                                </Avatar.Group>
                                <span className="subtask-assignee-name">
                                  {assigneeUsers.map(getUserDisplayName).join('、')}
                                </span>
                              </>
                            ) : (
                              <>
                                <UserOutlined />
                                <span className="subtask-assignee-name">负责人</span>
                              </>
                            )}
                          </Button>
                        </Tooltip>
                      </Popover>
                      <Button
                        type="text"
                        size="small"
                        className="subtask-detail-btn"
                        icon={<EyeOutlined />}
                        onClick={() => handleOpenSubtaskDetail(subtask)}
                      >
                        详情
                      </Button>
                    </div>
                  </div>
                )
              })}
              {canCreateSubtask && subtaskCreating && (
                <div
                  ref={subtaskCreateRowRef}
                  className="detail-subtask-row is-creating"
                >
                  <span className="subtask-check" />
                  <Input
                    size="small"
                    autoFocus
                    placeholder="输入内容，回车即可创建子任务"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onPressEnter={() => void handleAddSubtask()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSubtaskCreating(false)
                        resetSubtaskCreateDraft()
                      }
                    }}
                    style={{ flex: 1 }}
                    suffix={
                      <span
                        className="subtask-suffix-icons"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={markSubtaskCreateInteracting}
                      >
                        <Popover
                          trigger="click"
                          placement="bottomLeft"
                          content={
                            <div
                              style={{ width: 260 }}
                              onMouseDown={(e) => {
                                markSubtaskCreateInteracting()
                                e.preventDefault()
                              }}
                            >
                              <Calendar
                                fullscreen={false}
                                value={subtaskDue ?? undefined}
                                onSelect={setSubtaskDue}
                                disabledDate={(current) =>
                                  current && current < dayjs().startOf('day')
                                }
                              />
                            </div>
                          }
                        >
                          <Tooltip title="设置子任务截止时间">
                            <CalendarOutlined
                              className={`subtask-icon-btn ${subtaskDue ? 'active' : ''}`}
                            />
                          </Tooltip>
                        </Popover>
                        <Popover
                          trigger="click"
                          placement="bottomLeft"
                          content={
                            <div
                              style={{ width: 200 }}
                              onMouseDown={(e) => {
                                markSubtaskCreateInteracting()
                                e.preventDefault()
                              }}
                            >
                              <UserSearchSelect
                                autoFocus
                                size="small"
                                mode="multiple"
                                placeholder="选择负责人"
                                value={subtaskAssigneeIds}
                                onChange={(value) =>
                                  setSubtaskAssigneeIds(Array.isArray(value) ? value : [])
                                }
                                users={availableUsers}
                                style={{ width: '100%' }}
                              />
                            </div>
                          }
                        >
                          <Tooltip title="设置子任务负责人">
                            <UsergroupAddOutlined
                              className={`subtask-icon-btn ${subtaskAssigneeIds.length > 0 ? 'active' : ''}`}
                            />
                          </Tooltip>
                        </Popover>
                      </span>
                    }
                    onBlur={handleSubtaskCreateBlur}
                  />
                </div>
              )}
              {canCreateSubtask && !subtaskCreating && (
                <div
                  className="detail-subtask-row detail-subtask-add"
                  onClick={() => setSubtaskCreating(true)}
                >
                  <Tooltip title="添加子任务">
                    <PlusOutlined className="subtask-add-icon" />
                  </Tooltip>
                  <span className="subtask-add-text">添加子任务</span>
                </div>
              )}
              {!canCreateSubtask && (
                <div
                  className="detail-subtask-row"
                  style={{ color: '#86909c', fontSize: 12 }}
                >
                  已达子任务层级上限（共 5 层）
                </div>
              )}
            </div>
          </div>

          {/* Attachment row */}
          <div className="detail-field-row">
            <Tooltip title="附件" placement="top">
              <PaperClipOutlined className="field-icon" />
            </Tooltip>
            <div className="field-content">
              <Upload
                multiple
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleAttachmentUpload(file as File)
                  return false
                }}
              >
                <Button type="link" size="small" style={{ padding: 0 }}>
                  {attachmentUploading ? '上传中...' : '添加附件'}
                </Button>
              </Upload>
            </div>
          </div>
          {attachments.length > 0 && (
            <div className="detail-field-indent">
              <div className="detail-attachment-list">
                {attachments.map((att) => {
                  const ext = (att.file_name.split('.').pop() ?? '').toLowerCase()
                  const sizeKB = att.file_size / 1024
                  const sizeLabel =
                    sizeKB >= 1024
                      ? `${(sizeKB / 1024).toFixed(1)} MB`
                      : `${Math.max(1, Math.round(sizeKB))} KB`
                  return (
                    <div key={att.attachment_id} className="detail-attachment-card">
                      <div className="attachment-thumb">
                        <span className="attachment-ext">{ext || 'FILE'}</span>
                      </div>
                      <div className="attachment-main">
                        <div className="attachment-name" title={att.file_name}>
                          {att.file_name}
                        </div>
                        <div className="attachment-meta">{sizeLabel}</div>
                      </div>
                      <div className="attachment-actions">
                        <Tooltip title="预览附件">
                          <EyeOutlined
                            className="attachment-action"
                            onClick={() => handleOpenAttachmentPreview(att)}
                          />
                        </Tooltip>
                        <Tooltip title="下载附件">
                          <DownloadOutlined
                            className="attachment-action"
                            onClick={() => void handleAttachmentDownload(att)}
                          />
                        </Tooltip>
                      </div>
                      <Popconfirm
                        title="确定删除该附件？"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => handleAttachmentDelete(att.attachment_id)}
                      >
                        <Tooltip title="删除附件">
                          <DeleteOutlined className="attachment-delete" />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="detail-divider" />

        {/* Comments section */}
        <div className="detail-comments">
          <div className="comments-title">评论</div>
          <div className="comment-timeline">
            <div className="comment-item">
              <span className="comment-dot" />
              <div className="comment-content">
                <span className="comment-author">{creatorName}</span>
                <span className="comment-text"> 创建了任务</span>
                <span className="comment-time">
                  {dayjs(Number(task.created_at)).format('HH:mm')}
                </span>
              </div>
            </div>
            {comments.map((comment) => {
              const authorUser = resolveCommentAuthorUser(comment)
              const authorId = authorUser.id
              const isMine = authorId === appConfig.user_id
              const isEditing = editingCommentId === comment.comment_id
              return (
                <div key={comment.comment_id} className="comment-card">
                  {renderUserAvatar(authorUser, {
                    size: 28,
                    style: { backgroundColor: '#7b67ee', color: '#fff' },
                  })}
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-author">{getUserDisplayName(authorUser)}</span>
                      <span className="comment-time">
                        {dayjs(comment.created_at).format('MM-DD HH:mm')}
                      </span>
                      {comment.updated_at &&
                        comment.updated_at !== comment.created_at && (
                          <span className="comment-edited">（已编辑）</span>
                        )}
                      <div className="comment-actions">
                      <Tooltip title="评论当前评论">
                        <Button
                          type="text"
                          size="small"
                          className="comment-reply-btn"
                          onClick={() => handleReplyComment(comment)}
                        >
                          评论
                        </Button>
                      </Tooltip>
                      {isMine && !isEditing && (
                        <Dropdown
                          trigger={['click']}
                          placement="bottomLeft"
                          menu={{
                            items: [
                              {
                                key: 'edit',
                                label: '编辑',
                                onClick: () => handleStartEditComment(comment),
                              },
                              { type: 'divider' as const },
                              {
                                key: 'delete',
                                danger: true,
                                label: '删除',
                                onClick: () =>
                                  void handleDeleteComment(comment.comment_id),
                              },
                            ],
                          }}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={
                              <Tooltip title="更多评论操作">
                                <MoreOutlined />
                              </Tooltip>
                            }
                            className="comment-more-btn"
                          />
                        </Dropdown>
                      )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="comment-edit-wrap">
                        <TaskRichInput
                          mode="comment-edit"
                          value={editingCommentValue}
                          users={commentInputUsers}
                          placeholder="编辑评论"
                          className="comment-edit-input"
                          mentionIds={editingCommentMentions}
                          submitLabel="保存"
                          onChange={setEditingCommentValue}
                          onMentionIdsChange={setEditingCommentMentions}
                          onSubmit={async (content, mentions) => {
                            const nextContent = content.trim()
                            if (!nextContent) return
                            const updated = await updateComment(
                              task.guid,
                              comment.comment_id,
                              nextContent,
                              mentions.length > 0 ? mentions : undefined,
                            )
                            setComments((prev) =>
                              prev.map((c) => (c.comment_id === comment.comment_id ? updated : c)),
                            )
                            setEditingCommentId(null)
                            setEditingCommentValue('')
                            setEditingCommentMentions([])
                          }}
                        />
                        <Space size={8} style={{ marginTop: 6 }}>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditingCommentValue('')
                              setEditingCommentMentions([])
                            }}
                          >
                            取消
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <>
                        {comment.content && (
                          <TaskRichText html={comment.content} className="comment-text" />
                        )}
                        {(comment.attachment_ids ?? []).length > 0 && (
                          <div className="detail-attachment-list comment-attachment-list--posted">
                            {(comment.attachment_ids ?? []).map((id) => {
                              const att = commentAttachmentMap[id]
                              if (isImageAttachment(att)) {
                                return (
                                  <Tooltip key={id} title="预览评论图片">
                                    <button
                                      type="button"
                                      className="comment-image-card"
                                      onClick={() => att && handleOpenAttachmentPreview(att)}
                                    >
                                      <img
                                        className="comment-image-thumb"
                                        src={att ? buildAttachmentPreviewUrl(att) : ''}
                                        alt={att?.file_name ?? '评论图片'}
                                      />
                                    </button>
                                  </Tooltip>
                                )
                              }
                              const ext = (att?.file_name.split('.').pop() ?? '').toLowerCase()
                              const sizeKB = (att?.file_size ?? 0) / 1024
                              const sizeLabel = att
                                ? sizeKB >= 1024
                                  ? `${(sizeKB / 1024).toFixed(1)} MB`
                                  : `${Math.max(1, Math.round(sizeKB))} KB`
                                : ''
                              return (
                                <div key={id} className="detail-attachment-card">
                                  <div className="attachment-thumb">
                                    <span className="attachment-ext">
                                      {ext || 'FILE'}
                                    </span>
                                  </div>
                                  <div
                                    className="attachment-main"
                                    onClick={() => att && handleAttachmentDownload(att)}
                                  >
                                    <div className="attachment-name">
                                      {att?.file_name ?? '附件加载中...'}
                                    </div>
                                    {sizeLabel && (
                                      <div className="attachment-meta">{sizeLabel}</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="detail-footer">
        <TaskRichInput
          mode="comment"
          value={commentValue}
          users={commentInputUsers}
          placeholder="输入评论"
          className="comment-input-wrapper"
          focusVersion={commentFocusVersion}
          attachments={commentAttachments}
          attachmentOrigins={commentAttachmentOrigins}
          attachmentUploading={commentAttachmentUploading}
          mentionIds={commentMentions}
          submitLabel="发送"
          onChange={setCommentValue}
          onMentionIdsChange={setCommentMentions}
          onSubmit={(content, mentions) => handleSendComment(content, mentions)}
          onRequestMentionSearch={(keyword) =>
            commentInputUsers.filter((user) => {
              const lower = keyword.trim().toLowerCase()
              if (!lower) return true
              return user.id.toLowerCase().includes(lower) || user.name.toLowerCase().includes(lower)
            })
          }
          onRequestAttachmentUpload={(file) => handleCommentAttachmentUpload(file)}
          onAttachmentUploaded={(attachment, source = 'upload') => {
            setCommentAttachments((prev) =>
              prev.some((item) => item.attachment_id === attachment.attachment_id)
                ? prev
                : [...prev, attachment],
            )
            setCommentAttachmentMap((prev) => ({ ...prev, [attachment.attachment_id]: attachment }))
            setCommentAttachmentOrigins((prev) => ({
              ...prev,
              [attachment.attachment_id]: source,
            }))
          }}
          onPreviewAttachment={handleOpenAttachmentPreview}
          onDownloadAttachment={(attachment) => void handleAttachmentDownload(attachment)}
          onRemoveAttachment={handleRemoveCommentAttachment}
        />
        <Modal
          open={Boolean(previewAttachment)}
          footer={null}
          onCancel={() => setPreviewAttachment(null)}
          width={920}
          destroyOnHidden
          className="comment-preview-modal"
        >
          {previewAttachment && (
            <div className="comment-preview-shell">
              <FilePreviewRenderer
                content={previewContent}
                language={null}
                fileName={previewAttachment.file_name}
                isImage={isImageAttachment(previewAttachment)}
                isCodeFile={false}
                previewable={false}
                loading={previewLoading}
                imageUrl={previewImageUrl}
                onOpenInNewTab={() => {
                  window.open(
                    buildAttachmentPreviewUrl(previewAttachment),
                    '_blank',
                  )
                }}
                onDownload={() => void handleAttachmentDownload(previewAttachment)}
                onClose={() => setPreviewAttachment(null)}
              />
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
