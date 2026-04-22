import { useState, useEffect, useRef } from 'react'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Avatar from 'antd/es/avatar'
import Popover from 'antd/es/popover'
import Select from 'antd/es/select'
import Card from 'antd/es/card'
import Dropdown from 'antd/es/dropdown'
import message from 'antd/es/message'
import Modal from 'antd/es/modal'
import List from 'antd/es/list'
import Tooltip from 'antd/es/tooltip'
import Breadcrumb from 'antd/es/breadcrumb'
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
  FlagOutlined,
  HistoryOutlined,
  NodeIndexOutlined,
  ForkOutlined,
  AlignLeftOutlined,
  UsergroupAddOutlined,
  EyeOutlined,
  DownloadOutlined,
  DownOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Calendar from 'antd/es/calendar'
import type { Task, Tasklist, User } from '@/types/task'
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
  apiTaskToTask,
} from '@/services/taskService'
import {
  updateProject as apiUpdateProject,
} from '@/services/projectService'
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

const SUBTASK_CREATE_FLOATING_SELECTOR = [
  '.ant-popover',
  '.ant-select-dropdown',
  '.ant-picker-dropdown',
].join(',')

function isSubtaskCreateFloatingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(SUBTASK_CREATE_FLOATING_SELECTOR))
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
  const [panelWidth, setPanelWidth] = useState(360)
  const [selectedTasklistGuid] = useState(task.tasklists[0]?.tasklist_guid)
  const [selectedSectionGuid, setSelectedSectionGuid] = useState(
    task.tasklists[0]?.section_guid ?? '',
  )
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
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState<string | undefined>(undefined)
  const [subtaskDue, setSubtaskDue] = useState<dayjs.Dayjs | null>(null)
  const [parentTaskChain, setParentTaskChain] = useState<Task[]>([])
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
  const resizeStateRef = useRef<{ dragging: boolean; startX: number; startWidth: number }>({
    dragging: false,
    startX: 0,
    startWidth: 360,
  })
  const assignees = task.members.filter((m) => m.role === 'assignee')
  const isSubtask = Boolean(task.parent_task_guid)
  const creator: User = { id: task.creator.id, name: task.creator.id }
  const tasklistRef = task.tasklists[0]
  const creatorName = creator.name
  const currentTasklist = tasklistRef
    ? tasklists.find((item) => item.guid === tasklistRef.tasklist_guid)
    : undefined
  const currentSection = currentTasklist?.sections.find(
    (item) => item.guid === tasklistRef?.section_guid,
  )
  const selectedTasklist = tasklists.find((item) => item.guid === selectedTasklistGuid)
  const selectedSection = selectedTasklist?.sections.find(
    (item) => item.guid === selectedSectionGuid,
  )
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
        // 仅在 start/due/status/title 等关键字段有差异时回写，避免不必要的渲染
        if (
          fresh.start?.timestamp !== task.start?.timestamp ||
          fresh.due?.timestamp !== task.due?.timestamp ||
          fresh.status !== task.status ||
          fresh.summary !== task.summary
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
      const boundedWidth = Math.min(720, Math.max(320, nextWidth))
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

  useEffect(() => {
    listMembers()
      .then((members) =>
        setAvailableUsers(members.map((m) => ({ id: m.user_id, name: m.user_id }))),
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
  const followedUsers = followedUserIds.map((userId) => {
    const matched = availableUsers.find((user) => user.id === userId)
    return matched ?? { id: userId, name: userId }
  })
  const visibleFollowedUsers = followedUsers.slice(0, 3)
  const availableFollowerUsers = availableUsers.filter((user) => !followedUserIds.includes(user.id))

  useEffect(() => {
    setSelectedFollowerId(undefined)
  }, [task.guid, followedUserIdsKey])

  const handleTaskPatch = async (patch: Partial<Task>) => {
    const apiPatch: Record<string, unknown> = {}
    if (patch.summary !== undefined) apiPatch.title = patch.summary
    if (patch.description !== undefined) apiPatch.description = patch.description
    if (patch.status !== undefined) apiPatch.status = patch.status
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

  const handleAssigneeChange = async (value?: string) => {
    const currentPrimary = assignees[0]?.id ?? null
    const desiredPrimary = value ?? null
    try {
      if (desiredPrimary !== currentPrimary) {
        await patchTaskAssignee(task.guid, desiredPrimary)
      }
      const fresh = await getTask(task.guid)
      const nextTask = apiTaskToTask(fresh)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
    } catch {
      message.error('更新负责人失败')
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
      message.error(err instanceof Error ? err.message : '添加关注人失败')
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
      message.error(err instanceof Error ? err.message : '移除关注人失败')
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
                onChange={setSelectedFollowerId}
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
                    avatar={
                      <Avatar size={30} style={{ backgroundColor: '#7b67ee' }}>
                        {(user.name ?? user.id).slice(0, 1)}
                      </Avatar>
                    }
                    title={<Text className="followers-user-name">{user.name ?? user.id}</Text>}
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
              <Avatar key={user.id} size={20} style={{ backgroundColor: '#7b67ee' }}>
                {(user.name ?? user.id).slice(0, 1)}
              </Avatar>
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

  const resetSubtaskCreateDraft = () => {
    setSubtaskTitle('')
    setSubtaskAssigneeId(undefined)
    setSubtaskDue(null)
  }

  const cancelEmptySubtaskCreate = () => {
    setSubtaskCreating(false)
    resetSubtaskCreateDraft()
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
    const tasklistRef = task.tasklists[0]
    // 开始时间默认继承父任务
    const parentStart = task.start?.timestamp
      ? new Date(Number(task.start.timestamp)).toISOString()
      : undefined
    try {
      const apiTask = await createTaskApi({
        project_id: tasklistRef?.tasklist_guid ?? '',
        title: summary,
        parent_task_id: task.guid,
        section_id: selectedSectionGuid || tasklistRef?.section_guid,
        assignee_id: subtaskAssigneeId,
        start_date: parentStart,
        due_date: subtaskDue ? subtaskDue.toISOString() : undefined,
      })
      const createdTask = inheritParentStartForTasks([apiTaskToTask(apiTask)], task)[0]
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
      message.error(err instanceof Error ? err.message : '状态更新失败')
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
      message.error(err instanceof Error ? err.message : '更新子任务截止时间失败')
    }
  }

  const handleSubtaskAssigneeChange = async (subtask: Task, value?: string) => {
    try {
      const apiTask = await patchTaskAssignee(subtask.guid, value ?? null)
      const next = inheritParentStartForTasks([apiTaskToTask(apiTask)], task)[0]
      setSubtaskDrafts((prev) => prev.map((item) => (item.guid === subtask.guid ? next : item)))
      onTaskUpdated?.(next)
      setActiveSubtaskAssigneeGuid(null)
      message.success(value ? '已更新子任务负责人' : '已清空子任务负责人')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新子任务负责人失败')
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

  const handleChangeSection = async (nextSectionGuid: string) => {
    setSelectedSectionGuid(nextSectionGuid)
    try {
      const apiTask = await updateTaskApi(task.guid, {
        section_id: nextSectionGuid,
      })
      const nextTask = apiTaskToTask(apiTask)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
      message.success('已移动到新分组')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移动失败')
    }
  }

  const handleMoveTask = async () => {
    if (!selectedTasklistGuid || !selectedSectionGuid) {
      return
    }

    await handleTaskPatch({
      tasklists: [
        {
          tasklist_guid: selectedTasklistGuid,
          section_guid: selectedSectionGuid,
        },
      ],
    })
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
    const targetUserId = comment.author_id ?? comment.user_id ?? ''
    if (!targetUserId) return

    const mentionHtml = `<span class="task-rich-input-mention" data-mention-id="${targetUserId}" contenteditable="false">@${targetUserId}</span>&nbsp;`

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

  const handleCancelTask = async () => {
    try {
      const { cancelTask } = await import('@/services/taskService')
      await cancelTask(task.guid, { terminate: true })
      message.success('已取消任务')
      onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '取消失败')
    }
  }

  const moreMenu = {
    items: [
      { key: 'setting', icon: <FlagOutlined />, label: '设置父任务' },
      { key: 'prev', icon: <NodeIndexOutlined />, label: '设为里程碑' },
      { key: 'before', icon: <ForkOutlined rotate={180} />, label: '添加前置任务' },
      { key: 'after', icon: <ForkOutlined />, label: '添加后置任务' },
      { key: 'history', icon: <HistoryOutlined />, label: '查看历史记录' },
      { key: 'cancel', icon: <CloseOutlined />, label: '取消任务' },
      { key: 'report', icon: <FlagOutlined />, label: '举报' },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'delete') {
        void handleDeleteTask()
        return
      }
      if (key === 'cancel') {
        void handleCancelTask()
        return
      }
      message.info('功能开发中')
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

  return (
    <div className="detail-panel" style={{ width: panelWidth, minWidth: panelWidth }}>
      <div
        className="detail-resize-handle"
        onPointerDown={handleResizeStart}
      />
      {/* Header */}
      <div className="detail-top">
        {task.status === 'done' ? (
          <Tag
            icon={<CheckOutlined />}
            color="success"
            className="done-tag"
            style={{
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: 13,
              borderRadius: 6,
            }}
            onClick={() => {
              void patchTaskStatus(task.guid, 'todo')
                .then((apiTask) => {
                  const nextTask = apiTaskToTask(apiTask)
                  onTaskUpdated?.(nextTask)
                  if (!onTaskUpdated) onRefresh?.()
                })
                .catch((err) => {
                  message.error(err instanceof Error ? err.message : '状态更新失败')
                })
            }}
          >
            任务已完成
          </Tag>
        ) : (
          <Button
            size="small"
            icon={<CheckOutlined />}
            className="complete-btn"
            onClick={() => {
              void patchTaskStatus(task.guid, 'done')
                .then((apiTask) => {
                  const nextTask = apiTaskToTask(apiTask)
                  onTaskUpdated?.(nextTask)
                  if (!onTaskUpdated) onRefresh?.()
                })
                .catch((err) => {
                  message.error(err instanceof Error ? err.message : '状态更新失败')
                })
            }}
          >
            完成任务
          </Button>
        )}
        <div className="detail-actions">
          <Tooltip title="更多操作" placement="bottom">
            <Dropdown menu={moreMenu} trigger={['click']} placement="bottomLeft">
              <span className="detail-action-icon">
                <MoreOutlined />
              </span>
            </Dropdown>
          </Tooltip>
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
              items={parentTaskChain.map((parentTask) => ({
                key: parentTask.guid,
                title: (
                  <button
                    type="button"
                    className="detail-parent-chain-link"
                    onClick={() => handleOpenParentTask(parentTask)}
                  >
                    {parentTask.summary}
                  </button>
                ),
              }))}
            />
          )}

          {/* Title */}
          <div className="detail-title">{task.summary}</div>

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
                  <Select
                    size="small"
                    showSearch
                    allowClear
                    value={assignees[0]?.id}
                    onChange={(value) => void handleAssigneeChange(value)}
                    options={availableUsers.map((user) => ({
                      value: user.id,
                      label: user.name,
                    }))}
                  />
                </div>
              }
            >
              <div className="field-content field-clickable">
                {assignees.length > 0 ? (
                  <Space size={4} wrap>
                    {assignees.map((a) => (
                      <Tag key={a.id} className="assignee-tag">
                        <Space size={4}>
                          <Avatar size={16} style={{ backgroundColor: '#7b67ee', fontSize: 10 }}>
                            {(a.name ?? a.id).slice(0, 1)}
                          </Avatar>
                          {a.name ?? a.id}
                        </Space>
                      </Tag>
                    ))}
                  </Space>
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
              <Space size={8}>
                {isSubtask ? (
                  <Button
                    size="small"
                    disabled
                    className="date-tag-btn date-tag-readonly"
                    icon={<CalendarOutlined />}
                    title="子任务开始时间跟随父任务，不能单独修改"
                  >
                    {task.start
                      ? `开始 ${dayjs(Number(task.start.timestamp)).format('M月D日')}`
                      : '开始时间'}
                  </Button>
                ) : (
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    content={
                      <div style={{ width: 260 }} onMouseDown={(e) => e.preventDefault()}>
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
                      </div>
                    }
                  >
                    <Button size="small" className="date-tag-btn" icon={<CalendarOutlined />}>
                      {task.start
                        ? `开始 ${dayjs(Number(task.start.timestamp)).format('M月D日')}`
                        : '开始时间'}
                    </Button>
                  </Popover>
                )}
                <Popover
                  trigger="click"
                  placement="bottomLeft"
                  content={
                    <div style={{ width: 260 }} onMouseDown={(e) => e.preventDefault()}>
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
                  <Button size="small" className="date-tag-btn" icon={<CalendarOutlined />}>
                    {task.due
                      ? `截止 ${dayjs(Number(task.due.timestamp)).format('M月D日')}`
                      : '截止时间'}
                  </Button>
                </Popover>
              </Space>
            </div>
          </div>

          {/* Tasklist row */}
          {currentTasklist && (
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
                        {selectedTasklist?.name ?? currentTasklist.name}
                      </span>
                    )}
                    <span className="tasklist-divider">|</span>
                    <Popover
                      trigger="click"
                      placement="bottomLeft"
                      content={
                        <div className="detail-popover-panel">
                          <Text strong>选择分组</Text>
                          <Select
                            size="small"
                            value={selectedSectionGuid}
                            onChange={(value) => void handleChangeSection(value)}
                            options={(selectedTasklist?.sections ?? []).map((item) => ({
                              value: item.guid,
                              label: item.name,
                            }))}
                          />
                        </div>
                      }
                    >
                      <span className="tasklist-section-trigger">
                        {(selectedSection ?? currentSection)?.name ?? '选择分组'}
                        <Tooltip title="选择任务分组">
                          <DownOutlined className="tasklist-arrow" />
                        </Tooltip>
                      </span>
                    </Popover>
                  </span>
                </div>
              </div>
              <div className="detail-field-indent">
                <span
                  className="field-add-link"
                  onClick={() => void handleMoveTask()}
                >
                  + 添加至任务清单
                </span>
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
                    const next = nextValue.trim()
                    if (next !== (task.description ?? '')) {
                      await handleTaskPatch({ description: next })
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
                const assignee = subtask.members.find((m) => m.role === 'assignee')
                const assigneeUser = assignee
                  ? availableUsers.find((user) => user.id === assignee.id) ?? {
                    id: assignee.id,
                    name: assignee.name ?? assignee.id,
                  }
                  : undefined
                const dueDate = subtask.due ? dayjs(Number(subtask.due.timestamp)) : null
                return (
                  <div
                    key={subtask.guid}
                    className={`detail-subtask-row ${isDone ? 'is-done' : ''}`}
                  >
                    <Tooltip title="切换子任务状态">
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
                              value={assigneeUser?.id}
                              onChange={(value) => void handleSubtaskAssigneeChange(subtask, value)}
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
                            {assigneeUser ? (
                              <>
                                <Avatar size={20} style={{ backgroundColor: '#7b67ee' }}>
                                  {(assigneeUser.name ?? assigneeUser.id).slice(0, 1)}
                                </Avatar>
                                <span className="subtask-assignee-name">
                                  {assigneeUser.name ?? assigneeUser.id}
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
                              <Select
                                autoFocus
                                showSearch
                                size="small"
                                placeholder="选择负责人"
                                value={subtaskAssigneeId}
                                onChange={(value) => setSubtaskAssigneeId(value ?? undefined)}
                                options={availableUsers.map((u) => ({
                                  value: u.id,
                                  label: u.name,
                                }))}
                                style={{ width: '100%' }}
                                allowClear
                              />
                            </div>
                          }
                        >
                          <Tooltip title="设置子任务负责人">
                            <UsergroupAddOutlined
                              className={`subtask-icon-btn ${subtaskAssigneeId ? 'active' : ''}`}
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
              const authorId = comment.author_id ?? comment.user_id ?? ''
              const isMine = authorId === appConfig.user_id
              const isEditing = editingCommentId === comment.comment_id
              return (
                <div key={comment.comment_id} className="comment-card">
                  <Avatar size={28} style={{ backgroundColor: '#7b67ee' }}>
                    {(authorId || 'U').slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-author">{authorId}</span>
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
