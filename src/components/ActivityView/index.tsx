import { useEffect, useState } from 'react'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Segmented from 'antd/es/segmented'
import Tag from 'antd/es/tag'
import Checkbox from 'antd/es/checkbox'
import Empty from 'antd/es/empty'
import Button from 'antd/es/button'
import Avatar from 'antd/es/avatar'
import { FilterOutlined, CaretRightOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Task, User } from '@/types/task'
import { fetchUsers, getCurrentUser, toggleTaskStatus } from '@/mock/api'
import './index.less'

const { Title, Text } = Typography

interface ActivityViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

type ActivitySegment = 'created' | 'updated' | 'mentioned'

export default function ActivityView({ tasks, onTaskClick, onRefresh }: ActivityViewProps) {
  const [users, setUsers] = useState<User[]>([])
  const [segment, setSegment] = useState<ActivitySegment>('created')
  const currentUser = getCurrentUser()

  useEffect(() => {
    fetchUsers().then(setUsers)
  }, [])

  const filteredTasks = tasks.filter((task) => {
    switch (segment) {
      case 'created':
        return task.creator.id === currentUser.id
      case 'updated':
        return task.creator.id === currentUser.id && task.updated_at !== task.created_at
      case 'mentioned':
        return task.members.some(
          (member) => member.role === 'follower' && member.id === currentUser.id,
        )
      default:
        return true
    }
  })

  const getActivityTimestamp = (task: Task): string => {
    if (segment === 'created') {
      return task.created_at
    }
    return task.updated_at
  }

  // 按日期分组（今天 / 昨天 / 更早按日期）
  const now = dayjs()
  const grouped = new Map<string, Task[]>()
  for (const task of filteredTasks) {
    const d = dayjs(Number(getActivityTimestamp(task)))
    let label: string
    if (d.isSame(now, 'day')) label = '今天'
    else if (d.isSame(now.subtract(1, 'day'), 'day')) label = '昨天'
    else label = d.format('M月D日')
    if (!grouped.has(label)) grouped.set(label, [])
    grouped.get(label)!.push(task)
  }

  const groupEntries = Array.from(grouped.entries())

  const handleToggleStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    await toggleTaskStatus(task.guid)
    onRefresh()
  }

  return (
    <div className="activity-view">
      <div className="activity-header">
        <Title level={5} className="activity-title">
          动态
        </Title>
      </div>

      <div className="activity-toolbar">
        <Segmented
          size="small"
          value={segment}
          onChange={(v) => setSegment(v as ActivitySegment)}
          options={[
            { label: '我创建的任务', value: 'created' },
            { label: '我更新的任务', value: 'updated' },
            { label: '@我的任务', value: 'mentioned' },
          ]}
        />
        <Space className="activity-toolbar-right">
          <Button size="small" type="text" icon={<FilterOutlined />}>
            筛选
          </Button>
        </Space>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="activity-empty">
          <Empty description="暂无动态" />
        </div>
      ) : (
        <div className="activity-list">
          {groupEntries.map(([label, items]) => (
            <div key={label} className="activity-group">
              <div className="activity-date">
                <Text type="secondary" className="activity-date-label">
                  {label}
                </Text>
                <Tag className="activity-date-count">{items.length}</Tag>
              </div>
              {items.map((task) => {
                const assignees = task.members.filter(
                  (m) => m.role === 'assignee',
                )
                const operator = users.find((u) => u.id === task.creator.id)
                return (
                  <div
                    key={task.guid}
                    className="activity-item"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="activity-time">
                      {dayjs(Number(getActivityTimestamp(task))).format('HH:mm')}
                    </div>
                    <div className="activity-meta">
                      <Avatar
                        size={18}
                        style={{ backgroundColor: '#7b67ee', fontSize: 10 }}
                      >
                        {(operator?.name ?? 'U').slice(0, 1)}
                      </Avatar>
                      <Text type="secondary" className="activity-operator">
                        {operator?.name ?? '未知用户'}
                      </Text>
                      <Text type="secondary">创建了该任务</Text>
                    </div>
                    <div className="activity-task">
                      <Checkbox
                        checked={task.status === 'done'}
                        onClick={(e) => void handleToggleStatus(e, task)}
                      />
                      {task.subtask_count > 0 && (
                        <CaretRightOutlined className="subtask-icon" />
                      )}
                      <span
                        className={
                          task.status === 'done' ? 'task-summary done' : 'task-summary'
                        }
                      >
                        {task.summary}
                      </span>
                      {assignees.length > 0 && (
                        <div className="assignee-chip">
                          <Avatar
                            size={18}
                            style={{ backgroundColor: '#7b67ee', fontSize: 10 }}
                          >
                            {(assignees[0].name ?? 'U').slice(0, 1)}
                          </Avatar>
                          <Text style={{ fontSize: 12 }}>
                            {assignees[0].name ?? assignees[0].id}
                          </Text>
                        </div>
                      )}
                      {assignees.length === 0 && (
                        <UserOutlined className="assignee-empty" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
