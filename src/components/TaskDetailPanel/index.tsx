import { useState, useEffect, useRef } from 'react'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Avatar from 'antd/es/avatar'
import Popover from 'antd/es/popover'
import Select from 'antd/es/select'
import DatePicker from 'antd/es/date-picker'
import Dropdown from 'antd/es/dropdown'
import message from 'antd/es/message'
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
  ShareAltOutlined,
  CopyOutlined,
  AlignLeftOutlined,
  SmileOutlined,
  UsergroupAddOutlined,
  PictureOutlined,
  SendOutlined,
  DownOutlined,
  UnorderedListOutlined,
  FontSizeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
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
  deleteAttachment,
  downloadAttachment,
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
  listSubtasks,
  apiTaskToTask,
} from '@/services/taskService'
import './index.less'

const { Text } = Typography

interface TaskDetailPanelProps {
  task: Task
  tasklists: Tasklist[]
  onRefresh?: () => void
  onTaskUpdated?: (task: Task) => void
  onSubtaskCreated?: (task: Task) => void
  onTaskDeleted?: (taskGuid: string) => void
  onClose: () => void
}

export default function TaskDetailPanel({
  task,
  tasklists,
  onRefresh,
  onTaskUpdated,
  onSubtaskCreated,
  onTaskDeleted,
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
  const [descriptionVisible, setDescriptionVisible] = useState(Boolean(task.description))
  const [subtaskDrafts, setSubtaskDrafts] = useState<Task[]>([])
  const [subtaskCreating, setSubtaskCreating] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [subtaskAssigneeIds, setSubtaskAssigneeIds] = useState<string[]>([])
  const [subtaskDue, setSubtaskDue] = useState<dayjs.Dayjs | null>(null)
  const [, setAttachmentCount] = useState(0)
  const [attachments, setAttachments] = useState<ApiAttachment[]>([])
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const resizeStateRef = useRef<{ dragging: boolean; startX: number; startWidth: number }>({
    dragging: false,
    startX: 0,
    startWidth: 360,
  })
  const assignees = task.members.filter((m) => m.role === 'assignee')
  const followers = task.members.filter((m) => m.role === 'follower')
  const currentUser: User = { id: appConfig.user_id, name: appConfig.user_id }
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

  const handleAssigneeChange = async (values: string[]) => {
    try {
      const apiTask = await patchTaskAssignee(task.guid, values[0] ?? null)
      const nextTask = apiTaskToTask(apiTask)
      onTaskUpdated?.(nextTask)
      if (!onTaskUpdated) onRefresh?.()
    } catch {
      message.error('更新负责人失败')
    }
  }

  const handleDateQuickSet = async (
    field: 'start' | 'due',
    value: dayjs.Dayjs | null,
  ) => {
    await handleTaskPatch({
      [field]: value
        ? { timestamp: value.valueOf().toString(), is_all_day: false }
        : undefined,
    })
  }

  const handleAddSubtask = async () => {
    const summary = subtaskTitle.trim()
    if (!summary) {
      setSubtaskCreating(true)
      setSubtaskAssigneeIds((prev) => (prev.length > 0 ? prev : assignees.map((item) => item.id)))
      return
    }

    const tasklistRef = task.tasklists[0]
    const apiTask = await createTaskApi({
      project_id: tasklistRef?.tasklist_guid ?? '',
      title: summary,
      parent_task_id: task.guid,
      assignee_id: subtaskAssigneeIds[0] ?? assignees[0]?.id,
      section_id: selectedSectionGuid || tasklistRef?.section_guid,
      due_date: subtaskDue ? subtaskDue.toISOString() : undefined,
    })
    const createdTask = apiTaskToTask(apiTask)

    setSubtaskDrafts((prev) => [...prev, createdTask])
    setSubtaskCreating(false)
    setSubtaskTitle('')
    setSubtaskAssigneeIds([])
    setSubtaskDue(null)
    onSubtaskCreated?.(createdTask)
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

  const handleSendComment = async () => {
    const content = commentValue.trim()
    if (!content) {
      return
    }
    try {
      const created = await createComment(task.guid, content)
      setComments((prev) => [...prev, created])
      setCommentValue('')
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

  const moreMenu = {
    items: [
      { key: 'setting', icon: <FlagOutlined />, label: '设置父任务' },
      { key: 'prev', icon: <NodeIndexOutlined />, label: '设为里程碑' },
      { key: 'before', icon: <ForkOutlined rotate={180} />, label: '添加前置任务' },
      { key: 'after', icon: <ForkOutlined />, label: '添加后置任务' },
      { key: 'history', icon: <HistoryOutlined />, label: '查看历史记录' },
      { key: 'report', icon: <FlagOutlined />, label: '举报' },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'delete') {
        void handleDeleteTask()
        return
      }
      message.info('功能开发中')
    },
  }

  const tasklistCount = currentTasklist?.sections.reduce(
    (sum, s) => sum + (s.guid ? 1 : 0),
    0,
  ) ?? 0

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
        <Button
          type={task.status === 'done' ? 'primary' : 'default'}
          size="small"
          icon={<CheckOutlined />}
          className={task.status === 'done' ? 'done-btn' : 'complete-btn'}
          onClick={() => {
            const nextStatus = task.status === 'done' ? 'todo' : 'done'
            void patchTaskStatus(task.guid, nextStatus).then((apiTask) => {
              const nextTask = apiTaskToTask(apiTask)
              onTaskUpdated?.(nextTask)
              if (!onTaskUpdated) {
                onRefresh?.()
              }
            })
          }}
        >
          {task.status === 'done' ? '已完成' : '完成任务'}
        </Button>
        <div className="detail-actions">
          <span className="detail-action-icon detail-action-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="2" />
            </svg>
          </span>
          <span className="detail-action-icon">
            <ShareAltOutlined />
          </span>
          <span className="detail-action-icon">
            <CopyOutlined />
          </span>
          <Dropdown menu={moreMenu} trigger={['click']} placement="bottomRight">
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
                    mode="multiple"
                    size="small"
                    value={assignees.map((item) => item.id)}
                    onChange={(values) => void handleAssigneeChange(values)}
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
              <div className="date-tags">
                <Button
                  size="small"
                  className={`date-tag-btn ${
                    task.start && dayjs(Number(task.start.timestamp)).isSame(dayjs(), 'day')
                      ? 'date-tag-active'
                      : ''
                  }`}
                  icon={<CalendarOutlined />}
                  onClick={() => void handleDateQuickSet('start', dayjs().startOf('day'))}
                >
                  今天
                </Button>
                <Button
                  size="small"
                  className={`date-tag-btn date-tag-tomorrow ${
                    task.start &&
                    dayjs(Number(task.start.timestamp)).isSame(dayjs().add(1, 'day'), 'day')
                      ? 'date-tag-active'
                      : ''
                  }`}
                  icon={<CalendarOutlined />}
                  onClick={() => void handleDateQuickSet('start', dayjs().add(1, 'day').startOf('day'))}
                >
                  明天
                </Button>
                <Popover
                  trigger="click"
                  placement="bottomLeft"
                  content={
                    <div className="detail-popover-panel">
                      <Text strong>设置时间</Text>
                      <Select
                        size="small"
                        value={task.due ? 'due' : task.start ? 'start' : undefined}
                        placeholder="选择时间字段"
                        onChange={(value) =>
                          void handleDateQuickSet(
                            value as 'start' | 'due',
                            dayjs().add(2, 'day').startOf('day'),
                          )
                        }
                        options={[
                          { value: 'start', label: '设置开始时间' },
                          { value: 'due', label: '设置截止时间' },
                        ]}
                      />
                    </div>
                  }
                >
                  <Button size="small" className="date-tag-btn" icon={<CalendarOutlined />}>
                    其他时间
                  </Button>
                </Popover>
              </div>
            </div>
          </div>

          {/* Tasklist row */}
          {currentTasklist && (
            <>
              <div className="detail-field-row">
                <UnorderedListOutlined className="field-icon" />
                <div className="field-content">
                  <span className="tasklist-info">
                    <span className="tasklist-name">
                      {selectedTasklist?.name ?? currentTasklist.name}
                      {' '}
                      {tasklistCount > 0 && <span className="tasklist-count">{tasklistCount}</span>}
                    </span>
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
                            onChange={(value) => setSelectedSectionGuid(value)}
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
              onClick={() => setDescriptionVisible(true)}
            >
              <span className="field-placeholder">
                {descriptionVisible ? '编辑描述' : '添加描述'}
              </span>
            </div>
          </div>
          {descriptionVisible && (
            <div className="detail-field-indent">
              <Input.TextArea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={() => void handleTaskPatch({ description: descriptionDraft })}
                placeholder="输入任务描述"
                autoSize={{ minRows: 3, maxRows: 6 }}
                className="detail-description-input"
              />
            </div>
          )}

          {/* Subtask row */}
          <div className="detail-field-row">
            <BranchesOutlined className="field-icon" />
            <div
              className="field-content field-clickable"
              onClick={() => void handleAddSubtask()}
            >
              <span className="field-placeholder">添加子任务</span>
            </div>
          </div>
          {subtaskCreating && (
            <div className="detail-field-indent">
              <div className="detail-subtask-creator">
                <Input
                  size="small"
                  placeholder="输入子任务标题"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  onPressEnter={() => void handleAddSubtask()}
                  autoFocus
                />
                <div className="detail-subtask-create-grid">
                  <Select
                    mode="multiple"
                    size="small"
                    placeholder="负责人"
                    value={subtaskAssigneeIds}
                    onChange={setSubtaskAssigneeIds}
                    options={availableUsers.map((user) => ({
                      value: user.id,
                      label: user.name,
                    }))}
                  />
                  <DatePicker
                    size="small"
                    placeholder="截止时间"
                    value={subtaskDue}
                    onChange={(value) => setSubtaskDue(value)}
                  />
                </div>
                <Space size={8}>
                  <Button size="small" onClick={() => {
                    setSubtaskCreating(false)
                    setSubtaskTitle('')
                    setSubtaskAssigneeIds([])
                    setSubtaskDue(null)
                  }}>
                    取消
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    disabled={!subtaskTitle.trim()}
                    onClick={() => void handleAddSubtask()}
                  >
                    创建
                  </Button>
                </Space>
              </div>
            </div>
          )}
          {subtaskDrafts.length > 0 && (
            <div className="detail-field-indent">
              <div className="detail-subtasks">
                {subtaskDrafts.map((subtask) => (
                  <div key={subtask.guid} className="detail-subtask-item">
                    <BranchesOutlined />
                    <Text>{subtask.summary}</Text>
                    {subtask.members[0] && (
                      <Tag variant="filled" className="detail-subtask-assignee">
                        {subtask.members[0].name ?? subtask.members[0].id}
                      </Tag>
                    )}
                    {subtask.due && (
                      <Text type="secondary" className="detail-subtask-date">
                        {dayjs(Number(subtask.due.timestamp)).format('M月D日')}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <span className="field-placeholder" style={{ cursor: 'pointer' }}>
                  {attachmentUploading ? '上传中...' : '添加附件'}
                </span>
              </Upload>
            </div>
          </div>
          {attachments.length > 0 && (
            <div className="detail-field-indent">
              <div className="detail-attachment-list">
                {attachments.map((att) => (
                  <div key={att.attachment_id} className="detail-attachment-item">
                    <PaperClipOutlined style={{ color: '#86909c' }} />
                    <span
                      className="detail-attachment-name"
                      onClick={() => handleAttachmentDownload(att)}
                      style={{ cursor: 'pointer', flex: 1, marginLeft: 6 }}
                    >
                      {att.file_name}
                    </span>
                    <Popconfirm
                      title="确定删除该附件？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => handleAttachmentDelete(att.attachment_id)}
                    >
                      <DeleteOutlined style={{ color: '#86909c', cursor: 'pointer' }} />
                    </Popconfirm>
                  </div>
                ))}
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
              const isMine = comment.user_id === appConfig.user_id
              const isEditing = editingCommentId === comment.comment_id
              return (
                <div key={comment.comment_id} className="comment-item">
                  <span className="comment-dot" />
                  <div className="comment-content">
                    <span className="comment-author">{comment.user_id}</span>
                    {isEditing ? (
                      <span style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
                        <Input
                          size="small"
                          value={editingCommentValue}
                          onChange={(e) => setEditingCommentValue(e.target.value)}
                          onPressEnter={handleSaveEditComment}
                          style={{ width: 220 }}
                        />
                        <Button size="small" type="link" onClick={handleSaveEditComment}>
                          保存
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            setEditingCommentId(null)
                            setEditingCommentValue('')
                          }}
                        >
                          取消
                        </Button>
                      </span>
                    ) : (
                      <span className="comment-text">{`：${comment.content}`}</span>
                    )}
                    <span className="comment-time" style={{ marginLeft: 8 }}>
                      {dayjs(comment.created_at).format('HH:mm')}
                    </span>
                    {isMine && !isEditing && (
                      <span style={{ marginLeft: 8, display: 'inline-flex', gap: 8 }}>
                        <a onClick={() => handleStartEditComment(comment)}>编辑</a>
                        <Popconfirm
                          title="确定删除该评论？"
                          okText="删除"
                          cancelText="取消"
                          onConfirm={() => handleDeleteComment(comment.comment_id)}
                        >
                          <a>删除</a>
                        </Popconfirm>
                      </span>
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
          <Input
            placeholder="输入评论"
            className="comment-input"
            value={commentValue}
            onChange={(e) => setCommentValue(e.target.value)}
            onPressEnter={handleSendComment}
            variant="borderless"
          />
          <div className="comment-toolbar">
            <FontSizeOutlined className="toolbar-icon" />
            <SmileOutlined className="toolbar-icon" />
            <UsergroupAddOutlined className="toolbar-icon" />
            <SmileOutlined className="toolbar-icon" />
            <PictureOutlined className="toolbar-icon" />
            <PaperClipOutlined className="toolbar-icon" />
            <span className="toolbar-divider" />
            <SendOutlined
              className={`toolbar-send ${commentValue.trim() ? 'toolbar-send-active' : ''}`}
              onClick={handleSendComment}
            />
          </div>
        </div>
        <div className="detail-followers">
          <Avatar size={20} style={{ backgroundColor: '#f5a623' }}>
            {(currentUser.name ?? '').slice(0, 1)}
          </Avatar>
          <span className="followers-text">{followers.length + 1} 人关注</span>
          <PlusOutlined className="followers-add" />
        </div>
      </div>
    </div>
  )
}
