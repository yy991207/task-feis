import { useEffect, useMemo, useState } from 'react'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Empty from 'antd/es/empty'
import Button from 'antd/es/button'
import Avatar from 'antd/es/avatar'
import Spin from 'antd/es/spin'
import message from 'antd/es/message'
import { FilterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Task, User } from '@/types/task'
import { appConfig } from '@/config/appConfig'
import { listMembers } from '@/services/teamService'
import {
  apiTaskToTask,
  getTask,
  listMyActivities,
  type ApiTaskActivity,
} from '@/services/taskService'
import type { ReactNode } from 'react'
import './index.less'

const { Title, Text } = Typography

interface ActivityViewProps {
  onTaskClick: (task: Task) => void
  onTaskOpen: (task: Task) => void
  onRefresh: () => void
}

type ActivityGroup = {
  label: string
  day: string
  items: ApiTaskActivity[]
}

function formatActivityDateLabel(date: dayjs.Dayjs): string {
  const now = dayjs()
  if (date.isSame(now, 'day')) {
    return '今天'
  }
  if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天'
  }
  return date.format('M月D日')
}

function groupActivitiesByDate(activities: ApiTaskActivity[]): ActivityGroup[] {
  const grouped = new Map<string, ApiTaskActivity[]>()
  for (const activity of activities) {
    const date = dayjs(activity.created_at)
    const key = date.format('YYYY-MM-DD')
    const current = grouped.get(key) ?? []
    current.push(activity)
    grouped.set(key, current)
  }

  return Array.from(grouped.entries()).map(([key, items]) => {
    const date = dayjs(key)
    return {
      label: formatActivityDateLabel(date),
      day: date.format('D'),
      items,
    }
  })
}

function buildActivitySummary(activity: ApiTaskActivity, actorLabel: string): string {
  const payload = activity.payload as Record<string, unknown>
  const taskTitle =
    typeof payload.task_title === 'string' && payload.task_title.trim().length > 0
      ? payload.task_title.trim()
      : '该任务'
  const actor = actorLabel || '有人'

  switch (activity.event_type) {
    case 'task.created':
      return `${actor} 创建了 ${taskTitle}`
    case 'task.completed':
      return `${actor} 完成了 ${taskTitle}`
    case 'task.status_changed':
      return `${actor} 更新了 ${taskTitle} 的状态`
    case 'task.description_changed':
      return `${actor} 修改了 ${taskTitle} 的描述`
    case 'task.assignee_changed':
      return `${actor} 更新了 ${taskTitle} 的负责人`
    case 'comment.created':
      return `${actor} 在 ${taskTitle} 发了评论`
    default:
      return `${actor} 更新了 ${taskTitle}`
  }
}

function formatActivityText(activity: ApiTaskActivity, actorLabel: string): ReactNode {
  const payload = activity.payload as Record<string, unknown>
  const fieldLabel =
    typeof payload.field_name === 'string' && payload.field_name.trim().length > 0
      ? payload.field_name.trim()
      : '字段'
  const value =
    typeof payload.new_value === 'string'
      ? payload.new_value
      : typeof payload.comment_excerpt === 'string'
        ? payload.comment_excerpt
        : typeof payload.file_name === 'string'
          ? payload.file_name
          : '空'

  switch (activity.event_type) {
    case 'task.created':
      return (
        <>
          <span className="activity-person">{actorLabel}</span>
          <span> 创建了任务 </span>
          <span className="activity-task-title">{String(payload.task_title ?? '该任务')}</span>
        </>
      )
    case 'task.description_changed':
      return (
        <>
          <span className="activity-person">{actorLabel}</span>
          <span> 将“{fieldLabel}”修改为：</span>
          <span className="activity-value">{String(value)}</span>
        </>
      )
    case 'comment.created':
      return (
        <>
          <span className="activity-person">{actorLabel}</span>
          <span> 发表了评论：</span>
          <span className="activity-value">{String(value)}</span>
        </>
      )
    case 'attachment.uploaded':
      return (
        <>
          <span className="activity-person">{actorLabel}</span>
          <span> 上传了附件：</span>
          <span className="activity-value">{String(value)}</span>
        </>
      )
    default:
      return (
        <>
          <span className="activity-person">{actorLabel}</span>
          <span> 更新了任务</span>
        </>
      )
  }
}

export default function ActivityView({
  onTaskClick,
  onTaskOpen,
  onRefresh,
}: ActivityViewProps) {
  const [activities, setActivities] = useState<ApiTaskActivity[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([listMyActivities(1, 100), listMembers().catch(() => [])])
      .then(([activityList, members]) => {
        if (cancelled) return
        setActivities(activityList)
        setUsers(members.map((member) => ({ id: member.user_id, name: member.user_id })))
      })
      .catch(() => {
        if (!cancelled) {
          message.error('加载动态失败')
          setActivities([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [onRefresh])

  const groupedActivities = useMemo(() => groupActivitiesByDate(activities), [activities])

  const resolveUserLabel = (userId: string): string => {
    if (userId === appConfig.user_id) {
      return '我'
    }
    const user = users.find((item) => item.id === userId)
    return user?.name ?? userId
  }

  const handleTaskClick = async (activity: ApiTaskActivity) => {
    const taskId = activity.task_id
    if (!taskId) {
      return
    }
    try {
      const apiTask = await getTask(taskId)
      const task = apiTaskToTask(apiTask)
      onTaskClick(task)
      onTaskOpen(task)
    } catch {
      message.error('加载任务详情失败')
    }
  }

  return (
    <div className="activity-view">
      <div className="activity-header">
        <Title level={5} className="activity-title">
          动态
        </Title>
      </div>

      <div className="activity-toolbar">
        <Space className="activity-toolbar-right">
          <Button size="small" type="text" icon={<FilterOutlined />}>
            筛选
          </Button>
        </Space>
      </div>

      {loading ? (
        <div className="activity-empty">
          <Spin size="small" />
        </div>
      ) : activities.length === 0 ? (
        <div className="activity-empty">
          <Empty description="暂无动态" />
        </div>
      ) : (
        <div className="activity-list">
          {groupedActivities.map((group) => (
            <div key={`${group.label}-${group.day}`} className="activity-group">
              <div className="activity-date">
                <Text type="secondary" className="activity-date-label">
                  {group.label}
                </Text>
                <div className="activity-date-day">{group.day}</div>
              </div>

              <div className="activity-items">
                {group.items.map((activity) => {
                  const actorLabel = resolveUserLabel(activity.actor_id)
                  const summary = buildActivitySummary(activity, actorLabel)
                  return (
                    <div
                      key={activity.activity_id}
                      className="activity-item"
                      onClick={() => void handleTaskClick(activity)}
                    >
                      <div className="activity-time">
                        {dayjs(activity.created_at).format('HH:mm')}
                      </div>
                      <Avatar size={20} className="activity-avatar">
                        {actorLabel.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <div className="activity-content">
                        <div className="activity-summary">{summary}</div>
                        <div className="activity-detail">
                          {formatActivityText(activity, actorLabel)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
