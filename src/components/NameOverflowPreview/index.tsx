import type { ReactNode } from 'react'
import Tooltip from 'antd/es/tooltip'
import './index.less'

interface NameOverflowPreviewProps {
  name: string
  children: ReactNode
  previewClassName?: string
  disabled?: boolean
}

export default function NameOverflowPreview({
  name,
  children,
  previewClassName,
  disabled = false,
}: NameOverflowPreviewProps) {
  const trimmedName = name.trim()
  const displayName = trimmedName || '未命名'

  if (disabled) {
    return <>{children}</>
  }

  return (
    <span className={previewClassName}>
      <Tooltip title={displayName} mouseEnterDelay={0.4}>
        <span className="name-overflow-preview-trigger">{children}</span>
      </Tooltip>
    </span>
  )
}
