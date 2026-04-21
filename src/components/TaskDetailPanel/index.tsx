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
  SmileOutlined,
  UsergroupAddOutlined,
  PictureOutlined,
  SendOutlined,
  EyeOutlined,
  DownloadOutlined,
  DownOutlined,
  UnorderedListOutlined,
  FontSizeOutlined,
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
import UserSearchSelect from '@/components/UserSearchSelect'
import './index.less'

const { Text } = Typography

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
  const [comments, setComments] = useState<ApiComment[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentValue, setEditingCommentValue] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState(task.description)
  const [descriptionEditing, setDescriptionEditing] = useState(false)
  const [subtaskDrafts, setSubtaskDrafts] = useState<Task[]>([])
  const [subtaskCreating, setSubtaskCreating] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState<string | undefined>(undefined)
  const [subtaskDue, setSubtaskDue] = useState<dayjs.Dayjs | null>(null)
  const [selectedFollowerId, setSelectedFollowerId] = useState<string>()
  const [followersPopoverOpen, setFollowersPopoverOpen] = useState(false)
  const subtaskCreateRowRef = useRef<HTMLDivElement | null>(null)
  const subtaskInteractingRef = useRef(false)
  const subtaskSubmittingRef = useRef(false)
  const [, setAttachmentCount] = useState(0)
  const [attachments, setAttachments] = useState<ApiAttachment[]>([])
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [commentAttachments, setCommentAttachments] = useState<ApiAttachment[]>([])
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
      setSubtaskDrafts(items.map((t) => apiTaskToTask(t))),
    )
  }, [task.guid])

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
      const createdTask = apiTaskToTask(apiTask)
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
      const next = apiTaskToTask(apiTask)
      setSubtaskDrafts((prev) => prev.map((s) => (s.guid === subtask.guid ? next : s)))
      onTaskUpdated?.(next)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '状态更新失败')
    }
  }

  const handleAttachmentUpload = async (file: File) => {
    setAttachmentUploading(true)
    try {
      const created = await uploadAttachment(task.guid, file)
      setAttachments((prev) => [...prev, created])
      setAttachmentCount((prev) => prev + 1)
      message.success('附件已上传')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setAttachmentUploading(false)
    }
    return false
  }

  const handleCommentAttachmentUpload = async (file: File) => {
    setCommentAttachmentUploading(true)
    try {
      const created = await uploadAttachment(task.guid, file, { ownerType: 'comment' })
      setCommentAttachments((prev) => [...prev, created])
      setCommentAttachmentMap((prev) => ({ ...prev, [created.attachment_id]: created }))
      setAttachments((prev) =>
        prev.some((a) => a.attachment_id === created.attachment_id)
          ? prev
          : [...prev, created],
      )
      setAttachmentCount((prev) => prev + 1)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setCommentAttachmentUploading(false)
    }
    return false
  }

  const handleRemoveCommentAttachment = (attachmentId: string) => {
    setCommentAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId))
  }

  const handleCommentPaste = (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const items = Array.from(event.clipboardData.items)
    const imageItems = items.filter((item) => item.type.startsWith('image/'))
    if (imageItems.length === 0) {
      return
    }

    event.preventDefault()
    imageItems.forEach((item) => {
      const file = item.getAsFile()
      if (!file) {
        return
      }
      // 这里直接复用评论附件上传链路，避免粘贴图片再维护第二套上传逻辑。
      void handleCommentAttachmentUpload(file)
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

  const handleSendComment = async () => {
    const content = commentValue.trim()
    if (!content && commentAttachments.length === 0) {
      return
    }
    try {
      const attachmentIds = commentAttachments.map((a) => a.attachment_id)
      const created = await createComment(
        task.guid,
        content,
        undefined,
        attachmentIds.length > 0 ? attachmentIds : undefined,
      )
      setComments((prev) => [...prev, created])
      setCommentValue('')
      setCommentAttachments([])
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发送失败')
    }
  }

  const handleStartEditComment = (c: ApiComment) => {
    setEditingCommentId(c.comment_id)
    setEditingCommentValue(c.content)
  }

  const handleSaveEditComment = async () => {
    if (!editingCommentId) return
    const content = editingCommentValue.trim()
    if (!content) return
    try {
      const updated = await updateComment(task.guid, editingCommentId, content)
      setComments((prev) =>
        prev.map((c) => (c.comment_id === editingCommentId ? updated : c)),
      )
      setEditingCommentId(null)
      setEditingCommentValue('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    }
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
          <Dropdown menu={moreMenu} trigger={['click']} placement="bottomLeft">
            <span className="detail-action-icon">
              <MoreOutlined />
            </span>
          </Dropdown>
          <span className="detail-action-icon" onClick={onClose}>
            <CloseOutlined />
          </span>
        </div>
      </div>

      {/* Scrollable body + comments */}
      <div className="detail-scroll">
        <div className="detail-body">
          {/* Title */}
          <div className="detail-title">{task.summary}</div>

          {/* Assignee row */}
          <div className="detail-field-row">
            <UserOutlined className="field-icon" />
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

          {/* Date row */}
          <div className="detail-field-row">
            <CalendarOutlined className="field-icon" />
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
                <UnorderedListOutlined className="field-icon" />
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
                        <DownOutlined className="tasklist-arrow" />
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
            <AlignLeftOutlined className="field-icon" />
            <div
              className="field-content field-clickable"
              onClick={() => {
                setDescriptionDraft(task.description ?? '')
                setDescriptionEditing(true)
              }}
            >
              {descriptionEditing ? (
                <span className="field-placeholder">编辑描述</span>
              ) : task.description ? (
                <span className="detail-description-text">{task.description}</span>
              ) : (
                <span className="field-placeholder">添加描述</span>
              )}
            </div>
          </div>
          {descriptionEditing && (
            <div className="detail-field-indent">
              <Input.TextArea
                value={descriptionDraft}
                autoFocus
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={async () => {
                  const next = descriptionDraft ?? ''
                  if (next !== (task.description ?? '')) {
                    await handleTaskPatch({ description: next })
                  }
                  setDescriptionEditing(false)
                }}
                placeholder="输入任务描述"
                autoSize={{ minRows: 3, maxRows: 6 }}
                className="detail-description-input"
              />
            </div>
          )}

          {/* Subtask row */}
          <div className="detail-field-row">
            <BranchesOutlined className="field-icon" />
            <div className="field-content">
              <span className="field-placeholder">子任务</span>
            </div>
          </div>
          <div className="detail-field-indent">
            <div className="detail-subtasks">
              {subtaskDrafts.map((subtask) => {
                const isDone = subtask.status === 'done'
                const assignee = subtask.members.find((m) => m.role === 'assignee')
                return (
                  <div
                    key={subtask.guid}
                    className={`detail-subtask-row ${isDone ? 'is-done' : ''}`}
                    onClick={() => onOpenTask?.(subtask)}
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
                    <span className="subtask-title">{subtask.summary}</span>
                    <div
                      className="subtask-meta"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {subtask.due && (
                        <span className="subtask-date">
                          {dayjs(Number(subtask.due.timestamp)).format('M月D日')}
                        </span>
                      )}
                      {assignee && (
                        <Avatar size={20} style={{ backgroundColor: '#7b67ee' }}>
                          {(assignee.name ?? assignee.id).slice(0, 1)}
                        </Avatar>
                      )}
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
                          <CalendarOutlined
                            className={`subtask-icon-btn ${subtaskDue ? 'active' : ''}`}
                          />
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
                          <UsergroupAddOutlined
                            className={`subtask-icon-btn ${subtaskAssigneeId ? 'active' : ''}`}
                          />
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
                  <PlusOutlined className="subtask-add-icon" />
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
            <PaperClipOutlined className="field-icon" />
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
                        <EyeOutlined
                          className="attachment-action"
                          onClick={() => handleOpenAttachmentPreview(att)}
                        />
                        <DownloadOutlined
                          className="attachment-action"
                          onClick={() => void handleAttachmentDownload(att)}
                        />
                      </div>
                      <Popconfirm
                        title="确定删除该附件？"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => handleAttachmentDelete(att.attachment_id)}
                      >
                        <DeleteOutlined className="attachment-delete" />
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
                            icon={<MoreOutlined />}
                            className="comment-more-btn"
                          />
                        </Dropdown>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="comment-edit-wrap">
                        <Input.TextArea
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          value={editingCommentValue}
                          onChange={(e) => setEditingCommentValue(e.target.value)}
                        />
                        <Space size={8} style={{ marginTop: 6 }}>
                          <Button
                            size="small"
                            type="primary"
                            onClick={handleSaveEditComment}
                          >
                            保存
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditingCommentValue('')
                            }}
                          >
                            取消
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <>
                        {comment.content && (
                          <div className="comment-text">{comment.content}</div>
                        )}
                        {(comment.attachment_ids ?? []).length > 0 && (
                          <div className="detail-attachment-list comment-attachment-list--posted">
                            {(comment.attachment_ids ?? []).map((id) => {
                              const att = commentAttachmentMap[id]
                              if (isImageAttachment(att)) {
                                return (
                                  <button
                                    key={id}
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
        <div className="comment-input-wrapper">
          <Input.TextArea
            placeholder="输入评论"
            className="comment-input"
            value={commentValue}
            onChange={(e) => setCommentValue(e.target.value)}
            onPaste={handleCommentPaste}
            autoSize={{ minRows: 1, maxRows: 6 }}
            onPressEnter={(e) => {
              if (e.shiftKey) {
                return
              }
              e.preventDefault()
              void handleSendComment()
            }}
            variant="borderless"
          />
          {commentAttachments.length > 0 && (
            <div className="detail-attachment-list detail-comment-preview-list">
              {commentAttachments.map((att) => {
                if (isImageAttachment(att)) {
                  return (
                    <div key={att.attachment_id} className="comment-image-preview-item">
                      <button
                        type="button"
                        className="comment-image-card"
                        onClick={() => handleOpenAttachmentPreview(att)}
                      >
                        <img
                          className="comment-image-thumb"
                          src={buildAttachmentPreviewUrl(att)}
                          alt={att.file_name}
                        />
                      </button>
                      <DeleteOutlined
                        className="attachment-delete comment-image-delete"
                        onClick={() => handleRemoveCommentAttachment(att.attachment_id)}
                      />
                    </div>
                  )
                }
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
                    <DeleteOutlined
                      className="attachment-delete"
                      onClick={() => handleRemoveCommentAttachment(att.attachment_id)}
                    />
                  </div>
                )
              })}
            </div>
          )}
          <div className="comment-toolbar">
            <FontSizeOutlined className="toolbar-icon" />
            <SmileOutlined className="toolbar-icon" />
            <UsergroupAddOutlined className="toolbar-icon" />
            <SmileOutlined className="toolbar-icon" />
            <PictureOutlined className="toolbar-icon" />
            <Upload
              multiple
              showUploadList={false}
              beforeUpload={(file) => {
                void handleCommentAttachmentUpload(file as File)
                return false
              }}
            >
              <PaperClipOutlined
                className="toolbar-icon"
                style={commentAttachmentUploading ? { opacity: 0.5 } : undefined}
              />
            </Upload>
            <span className="toolbar-divider" />
            <SendOutlined
              className={`toolbar-send ${
                commentValue.trim() || commentAttachments.length > 0 ? 'toolbar-send-active' : ''
              }`}
              onClick={handleSendComment}
            />
          </div>
        </div>
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
        <Popover
          open={followersPopoverOpen}
          onOpenChange={setFollowersPopoverOpen}
          placement="topLeft"
          trigger="click"
          content={followerPopoverContent}
          overlayClassName="followers-popover-overlay"
        >
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
        </Popover>
      </div>
    </div>
  )
}
