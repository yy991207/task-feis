import { useEffect, useState } from 'react'
import Modal from 'antd/es/modal'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Switch from 'antd/es/switch'
import Button from 'antd/es/button'
import Tabs from 'antd/es/tabs'
import List from 'antd/es/list'
import Tag from 'antd/es/tag'
import Popconfirm from 'antd/es/popconfirm'
import message from 'antd/es/message'
import {
  DeleteOutlined,
  PlusOutlined,
  HolderOutlined,
  EditOutlined,
} from '@ant-design/icons'
import {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  type ApiCustomField,
  type CustomFieldType,
  type FieldOption,
} from '@/services/customFieldService'

interface Props {
  open: boolean
  projectId: string
  initialType?: CustomFieldType
  field?: ApiCustomField | null
  existingFields?: ApiCustomField[]
  onClose: () => void
  onSaved?: (field: ApiCustomField) => void
  onDeleted?: (fieldId: string) => void
  onPickExisting?: (field: ApiCustomField) => void
}

const TYPE_OPTIONS: { label: string; value: CustomFieldType }[] = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '单选', value: 'select' },
  { label: '多选', value: 'multi_select' },
  { label: '成员', value: 'member' },
]

const PRESET_COLORS = [
  '#3370ff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#5ac8fa', '#ffcc00', '#ff2d55', '#5856d6', '#a2845e',
]

function getEnabledFieldOptions(field?: ApiCustomField | null): FieldOption[] {
  return (field?.options ?? []).filter((option) => !(option.is_disabled === true))
}

export default function CustomFieldEditorModal({
  open,
  projectId,
  initialType,
  field,
  existingFields = [],
  onClose,
  onSaved,
  onDeleted,
  onPickExisting,
}: Props) {
  const isEdit = !!field
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new')
  const [type, setType] = useState<CustomFieldType>(field?.field_type ?? initialType ?? 'text')
  const [name, setName] = useState(field?.name ?? '')
  const [required, setRequired] = useState(field?.required ?? false)
  const [options, setOptions] = useState<FieldOption[]>(() => getEnabledFieldOptions(field))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setActiveTab('new')
      setType(field?.field_type ?? initialType ?? 'text')
      setName(field?.name ?? '')
      setRequired(field?.required ?? false)
      setOptions(getEnabledFieldOptions(field))
    }
  }, [open, field, initialType])

  const needsOptions = type === 'select' || type === 'multi_select'

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        value: `opt_${Date.now()}_${prev.length}`,
        label: '',
        color: PRESET_COLORS[prev.length % PRESET_COLORS.length],
      },
    ])
  }

  const updateOption = (idx: number, patch: Partial<FieldOption>) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  }

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      message.warning('请输入字段标题')
      return
    }
    if (needsOptions) {
      const valid = options.filter((o) => o.label.trim())
      if (valid.length === 0) {
        message.warning('请至少添加一个选项')
        return
      }
    }
    setSubmitting(true)
    try {
      const finalOptions = needsOptions
        ? options
            .filter((o) => o.label.trim())
            .map((o) => ({ value: o.value, label: o.label.trim(), color: o.color }))
        : undefined
      let saved: ApiCustomField
      if (isEdit && field) {
        saved = await updateCustomField(field.field_id, {
          name: trimmed,
          required,
          options: finalOptions,
        })
        message.success('已更新字段')
      } else {
        saved = await createCustomField(projectId, {
          name: trimmed,
          field_type: type,
          required,
          options: finalOptions,
        })
        message.success('已创建字段')
      }
      onSaved?.(saved)
      onClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExisting = async (f: ApiCustomField) => {
    try {
      await deleteCustomField(f.field_id)
      message.success('已删除字段')
      onDeleted?.(f.field_id)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleDeleteCurrentField = async () => {
    if (!field) {
      return
    }
    try {
      await deleteCustomField(field.field_id)
      message.success('已删除字段')
      onDeleted?.(field.field_id)
      onClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const typeLabel = (t: CustomFieldType) =>
    TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t

  const newFieldForm = (
    <Form layout="vertical">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 16,
        }}
      >
        <Form.Item label="字段标题" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入字段标题"
            maxLength={50}
          />
        </Form.Item>
        <Form.Item label="字段类型" required>
          <Select
            value={type}
            onChange={(v) => setType(v as CustomFieldType)}
            options={TYPE_OPTIONS}
            disabled={isEdit}
          />
        </Form.Item>
      </div>

      {needsOptions && (
        <Form.Item label="选项">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {options.map((opt, idx) => (
              <div
                key={opt.value}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <HolderOutlined style={{ color: '#86909c' }} />
                <input
                  type="color"
                  value={opt.color ?? '#3370ff'}
                  onChange={(e) => updateOption(idx, { color: e.target.value })}
                  style={{
                    width: 24,
                    height: 24,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(idx, { label: e.target.value })}
                  placeholder={`选项 ${idx + 1}`}
                  style={{ flex: 1 }}
                  maxLength={30}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeOption(idx)}
                />
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={addOption} block>
              添加选项
            </Button>
          </div>
        </Form.Item>
      )}

      <Form.Item label="是否必填">
        <Switch checked={required} onChange={setRequired} />
        <span style={{ color: '#86909c', fontSize: 12, marginLeft: 8 }}>
          开启后该字段必须填写
        </span>
      </Form.Item>
    </Form>
  )

  const existingList = (
    <List
      dataSource={existingFields}
      locale={{ emptyText: '暂无已创建字段' }}
      renderItem={(f) => (
        <List.Item
          actions={[
            <Button
              key="use"
              type="link"
              size="small"
              onClick={() => {
                onPickExisting?.(f)
                onClose()
              }}
            >
              使用
            </Button>,
            <Button
              key="edit"
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                onPickExisting?.(f)
              }}
            />,
            <Popconfirm
              key="del"
              title="删除该字段？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => handleDeleteExisting(f)}
            >
              <Button type="text" size="small" icon={<DeleteOutlined />} />
            </Popconfirm>,
          ]}
        >
          <List.Item.Meta
            title={
              <span>
                {f.name}
                <Tag style={{ marginLeft: 8 }}>{typeLabel(f.field_type)}</Tag>
                {f.required && <Tag color="red">必填</Tag>}
              </span>
            }
            description={
              f.options && f.options.length > 0
                ? f.options.map((o) => o.label).join(' / ')
                : undefined
            }
          />
        </List.Item>
      )}
    />
  )

  return (
    <Modal
      title={isEdit ? '编辑字段' : '添加自定义字段'}
      open={open}
      onCancel={onClose}
      footer={
        activeTab === 'new' ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {isEdit && (
              <Popconfirm
                title="删除该字段？"
                description="删除后当前清单和任务里的这个字段都会一起移除。"
                okText="删除字段"
                cancelText="取消"
                onConfirm={() => handleDeleteCurrentField()}
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除字段
                </Button>
              </Popconfirm>
            )}
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              {isEdit ? '保存' : '创建字段'}
            </Button>
          </div>
        ) : null
      }
      width={640}
      zIndex={1100}
      destroyOnHidden
    >
      {isEdit ? (
        newFieldForm
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'new' | 'existing')}
          items={[
            { key: 'new', label: '新建字段', children: newFieldForm },
            { key: 'existing', label: '已创建字段', children: existingList },
          ]}
        />
      )}
    </Modal>
  )
}
