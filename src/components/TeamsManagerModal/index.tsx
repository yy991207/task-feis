import { useEffect, useState } from 'react'
import Modal from 'antd/es/modal'
import List from 'antd/es/list'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Popconfirm from 'antd/es/popconfirm'
import message from 'antd/es/message'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { appConfig } from '@/config/appConfig'
import {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type Team,
} from '@/services/teamService'

interface Props {
  open: boolean
  onClose: () => void
}

export default function TeamsManagerModal({ open, onClose }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<{
    name: string
    description?: string
    avatar_url?: string
  }>()

  const load = async () => {
    setLoading(true)
    try {
      setTeams(await listTeams())
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  const submit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateTeam(editing.team_id, values)
        message.success('已更新团队')
      } else {
        await createTeam(values.name, values.description, values.avatar_url)
        message.success('已创建团队')
      }
      setCreating(false)
      setEditing(null)
      form.resetFields()
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleDelete = async (teamId: string) => {
    try {
      await deleteTeam(teamId)
      message.success('已删除团队')
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const startEdit = (t: Team) => {
    setEditing(t)
    setCreating(true)
    form.setFieldsValue({
      name: t.name,
      description: t.description ?? '',
      avatar_url: t.avatar_url ?? '',
    })
  }

  const startCreate = () => {
    setEditing(null)
    setCreating(true)
    form.resetFields()
  }

  return (
    <Modal
      title="团队管理"
      open={open}
      onCancel={() => {
        onClose()
        setCreating(false)
        setEditing(null)
      }}
      footer={null}
      width={560}
    >
      {!creating && (
        <>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            block
            onClick={startCreate}
            style={{ marginBottom: 12 }}
          >
            新建团队
          </Button>
          <List
            loading={loading}
            dataSource={teams}
            locale={{ emptyText: '暂无团队' }}
            renderItem={(t) => (
              <List.Item
                actions={[
                  <Button
                    key="e"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => startEdit(t)}
                  />,
                  <Popconfirm
                    key="d"
                    title="删除该团队？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => handleDelete(t.team_id)}
                  >
                    <Button type="text" size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{t.name}</span>
                      {t.team_id === appConfig.team_id && <Tag color="blue">当前</Tag>}
                      {t.owner_id === appConfig.user_id && <Tag>我是负责人</Tag>}
                    </Space>
                  }
                  description={t.description || t.team_id}
                />
              </List.Item>
            )}
          />
        </>
      )}
      {creating && (
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="团队名称" rules={[{ required: true }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item name="avatar_url" label="头像URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={submit}>
              保存
            </Button>
            <Button
              onClick={() => {
                setCreating(false)
                setEditing(null)
                form.resetFields()
              }}
            >
              取消
            </Button>
          </Space>
        </Form>
      )}
    </Modal>
  )
}
