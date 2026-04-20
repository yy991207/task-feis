import { useEffect, useState } from 'react'
import Dropdown from 'antd/es/dropdown'
import Button from 'antd/es/button'
import Tooltip from 'antd/es/tooltip'
import Tag from 'antd/es/tag'
import Spin from 'antd/es/spin'
import Empty from 'antd/es/empty'
import message from 'antd/es/message'
import { UserSwitchOutlined, CheckOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd/es/menu'
import { listMembers, type TeamMember } from '@/services/teamService'
import { appConfig, switchCurrentUser } from '@/config/appConfig'

const roleColor: Record<TeamMember['role'], string> = {
  owner: 'gold',
  admin: 'blue',
  member: 'default',
}

const roleLabel: Record<TeamMember['role'], string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
}

export default function UserSwitcher() {
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || members !== null) return
    setLoading(true)
    listMembers()
      .then((list) => setMembers(list))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '加载成员失败'
        message.error(msg)
        setMembers([])
      })
      .finally(() => setLoading(false))
  }, [open, members])

  const currentUserId = appConfig.user_id

  const handleSwitch = (userId: string) => {
    if (userId === currentUserId) {
      setOpen(false)
      return
    }
    message.success(`已切换到用户 ${userId},正在刷新...`)
    setTimeout(() => switchCurrentUser(userId), 300)
  }

  const items: MenuProps['items'] =
    loading || members === null
      ? [
          {
            key: 'loading',
            label: (
              <div style={{ padding: '8px 16px', textAlign: 'center' }}>
                <Spin size="small" />
              </div>
            ),
            disabled: true,
          },
        ]
      : members.length === 0
        ? [
            {
              key: 'empty',
              label: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无成员"
                  style={{ margin: 0 }}
                />
              ),
              disabled: true,
            },
          ]
        : [
            {
              key: 'header',
              type: 'group',
              label: '切换当前身份',
            },
            ...members.map((m) => {
              const isCurrent = m.user_id === currentUserId
              return {
                key: m.user_id,
                label: (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 200,
                    }}
                  >
                    <span style={{ width: 16, display: 'inline-flex' }}>
                      {isCurrent ? (
                        <CheckOutlined style={{ color: '#3370ff' }} />
                      ) : null}
                    </span>
                    <span style={{ flex: 1 }}>{m.user_id}</span>
                    <Tag color={roleColor[m.role]} style={{ marginInlineEnd: 0 }}>
                      {roleLabel[m.role]}
                    </Tag>
                  </div>
                ),
                onClick: () => handleSwitch(m.user_id),
              }
            }),
          ]

  return (
    <Tooltip title={`当前用户: ${currentUserId}`}>
      <Dropdown
        menu={{ items }}
        trigger={['click']}
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
      >
        <Button type="text" size="small" icon={<UserSwitchOutlined />} />
      </Dropdown>
    </Tooltip>
  )
}
