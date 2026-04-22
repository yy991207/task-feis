import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import type { CSSProperties } from 'react'
import type { User } from '@/types/task'
import './index.less'

interface UserSearchSelectProps {
  users: User[]
  value?: string | string[]
  label?: string
  placeholder?: string
  className?: string
  size?: 'small' | 'middle' | 'large'
  autoFocus?: boolean
  open?: boolean
  style?: CSSProperties
  mode?: 'multiple'
  getPopupContainer?: () => HTMLElement
  onChange: (value?: string | string[]) => void
  onOpenChange?: (open: boolean) => void
}

export default function UserSearchSelect({
  users,
  value,
  label,
  placeholder = '搜索用户',
  className,
  size = 'small',
  autoFocus,
  open,
  style,
  mode,
  getPopupContainer,
  onChange,
  onOpenChange,
}: UserSearchSelectProps) {
  return (
    <div className={className ? `user-search-select ${className}` : 'user-search-select'}>
      {label && (
        <Typography.Text strong className="user-search-select-label">
          {label}
        </Typography.Text>
      )}
      <Select
        size={size}
        open={open}
        onOpenChange={onOpenChange}
        getPopupContainer={getPopupContainer}
        style={style}
        placeholder={placeholder}
        mode={mode}
        value={value}
        onChange={onChange}
        allowClear
        options={users.map((user) => ({ label: user.name, value: user.id }))}
        autoFocus={autoFocus}
        showSearch
      />
    </div>
  )
}
