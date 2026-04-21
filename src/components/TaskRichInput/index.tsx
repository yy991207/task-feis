import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, FocusEvent, KeyboardEvent } from 'react'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Popover from 'antd/es/popover'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Tooltip from 'antd/es/tooltip'
import Typography from 'antd/es/typography'
import Upload from 'antd/es/upload'
import message from 'antd/es/message'
import {
  BoldOutlined,
  ContainerOutlined,
  DeleteOutlined,
  ItalicOutlined,
  LinkOutlined,
  EyeOutlined,
  DownloadOutlined,
  OrderedListOutlined,
  PaperClipOutlined,
  PictureOutlined,
  SendOutlined,
  SmileOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import type { ApiAttachment } from '@/services/attachmentService'
import {
  buildAttachmentPreviewUrl,
  getAttachmentFileNameValidationError,
  isImageAttachment,
} from '@/services/attachmentService'
import type { User } from '@/types/task'
import './index.less'

const { Text } = Typography

const MentionOutlined = UsergroupAddOutlined

export type TaskRichInputMode = 'description' | 'comment' | 'comment-edit'
export type TaskRichAttachmentSource = 'upload' | 'paste'

const TASK_RICH_INPUT_TOOLTIP_TITLE: Record<TaskRichInputMode, string> = {
  description: '任务描述输入框：用于编辑任务背景和说明，失焦后自动保存，支持 @ 选人、链接和图片粘贴。',
  comment: '评论输入框：用于补充任务评论，支持 @ 选人、链接、图片粘贴和附件，按 Enter 发送。',
  'comment-edit': '评论编辑输入框：用于修改已有评论，支持 @ 选人、链接和图片粘贴，按 Enter 保存。',
}

export interface TaskRichInputProps {
  mode: TaskRichInputMode
  value: string
  users: User[]
  placeholder?: string
  className?: string
  autoFocus?: boolean
  disabled?: boolean
  attachments?: ApiAttachment[]
  attachmentOrigins?: Record<string, TaskRichAttachmentSource>
  attachmentUploading?: boolean
  mentionIds?: string[]
  submitLabel?: string
  onChange: (value: string) => void
  onMentionIdsChange?: (mentionIds: string[]) => void
  onSubmit?: (value: string, mentionIds: string[]) => void | Promise<void>
  onBlurCommit?: (value: string, mentionIds: string[]) => void | Promise<void>
  onRequestMentionSearch?: (keyword: string) => User[]
  onRequestAttachmentUpload?: (
    file: File,
  ) => Promise<ApiAttachment | null | undefined> | ApiAttachment | null | undefined
  onAttachmentUploaded?: (attachment: ApiAttachment, source?: TaskRichAttachmentSource) => void
  onPreviewAttachment?: (attachment: ApiAttachment) => void
  onDownloadAttachment?: (attachment: ApiAttachment) => void
  onRemoveAttachment?: (attachmentId: string) => void
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll('`', '&#96;')
}

function sanitizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return ''
  return `https://${trimmed}`
}

function getParser(): DOMParser | null {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return null
  }
  return new DOMParser()
}

function hasRichTags(input: string): boolean {
  return /<(?:\/?(?:p|div|br|strong|b|em|i|u|s|del|blockquote|ul|ol|li|a|img|span))\b/i.test(
    input,
  )
}

function serializeChildren(node: ParentNode): string {
  let html = ''
  node.childNodes.forEach((child) => {
    html += serializeNode(child)
  })
  return html
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()

  if (tag === 'br') {
    return '<br />'
  }

  if (tag === 'img') {
    const src = sanitizeUrl(element.getAttribute('src') ?? '')
    if (!src) return ''
    const alt = element.getAttribute('alt') ?? ''
    const attachmentId = element.getAttribute('data-attachment-id')
    const attrs = [`src="${escapeAttr(src)}"`]
    if (alt) attrs.push(`alt="${escapeAttr(alt)}"`)
    if (attachmentId) attrs.push(`data-attachment-id="${escapeAttr(attachmentId)}"`)
    return `<img ${attrs.join(' ')} />`
  }

  if (tag === 'a') {
    const href = sanitizeUrl(element.getAttribute('href') ?? '')
    const inner = serializeChildren(element)
    if (!href) return inner
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer noopener">${inner}</a>`
  }

  if (tag === 'span') {
    const mentionId = element.getAttribute('data-mention-id')
    if (mentionId) {
      const inner = serializeChildren(element) || escapeHtml(element.textContent ?? '')
      return `<span class="task-rich-input-mention" data-mention-id="${escapeAttr(mentionId)}" contenteditable="false">${inner}</span>`
    }
    return serializeChildren(element)
  }

  if (
    tag === 'strong' ||
    tag === 'b' ||
    tag === 'em' ||
    tag === 'i' ||
    tag === 'u' ||
    tag === 's' ||
    tag === 'del' ||
    tag === 'blockquote' ||
    tag === 'ul' ||
    tag === 'ol' ||
    tag === 'li' ||
    tag === 'p' ||
    tag === 'div'
  ) {
    return `<${tag}>${serializeChildren(element)}</${tag}>`
  }

  return serializeChildren(element)
}

export function normalizeRichContent(value: string): string {
  const input = value ?? ''
  if (!input) return ''

  if (!hasRichTags(input)) {
    return escapeHtml(input).replaceAll(/\r?\n/g, '<br />')
  }

  const parser = getParser()
  if (!parser) {
    return escapeHtml(input).replaceAll(/\r?\n/g, '<br />')
  }

  const doc = parser.parseFromString(input, 'text/html')
  return serializeChildren(doc.body)
}

export function isRichContentEmpty(value: string, attachmentCount = 0): boolean {
  const html = normalizeRichContent(value)
  if (attachmentCount > 0) {
    return false
  }

  if (!html) {
    return true
  }

  const parser = getParser()
  if (!parser) {
    return html.replaceAll(/<br\s*\/?>/gi, '').trim().length === 0
  }

  const doc = parser.parseFromString(html, 'text/html')
  const text = (doc.body.textContent ?? '').replaceAll(/\u00a0/g, ' ').trim()
  if (text.length > 0) {
    return false
  }

  return !/<img\b/i.test(html)
}

export function extractMentionIds(value: string): string[] {
  const html = normalizeRichContent(value)
  const parser = getParser()
  if (!parser) return []
  const doc = parser.parseFromString(html, 'text/html')
  return Array.from(doc.body.querySelectorAll('[data-mention-id]'))
    .map((element) => element.getAttribute('data-mention-id'))
    .filter((item): item is string => Boolean(item))
}

export interface TaskRichTextProps {
  html: string
  className?: string
}

export function TaskRichText({ html, className }: TaskRichTextProps) {
  const normalizedHtml = normalizeRichContent(html)
  if (!normalizedHtml) {
    return null
  }

  return (
    <div
      className={className ? `task-rich-text ${className}` : 'task-rich-text'}
      dangerouslySetInnerHTML={{ __html: normalizedHtml }}
    />
  )
}

export default function TaskRichInput({
  mode,
  value,
  users,
  placeholder = '输入内容',
  className,
  autoFocus,
  disabled,
  attachments = [],
  attachmentOrigins = {},
  attachmentUploading = false,
  mentionIds,
  submitLabel = '发送',
  onChange,
  onMentionIdsChange,
  onSubmit,
  onBlurCommit,
  onRequestMentionSearch,
  onRequestAttachmentUpload,
  onAttachmentUploaded,
  onPreviewAttachment,
  onDownloadAttachment,
  onRemoveAttachment,
}: TaskRichInputProps) {
  const [editorHtml, setEditorHtml] = useState(() => normalizeRichContent(value))
  const [currentMentionIds, setCurrentMentionIds] = useState<string[]>(mentionIds ?? [])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkHref, setLinkHref] = useState('')
  const editorRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const selectionRef = useRef<Range | null>(null)
  const editorHtmlRef = useRef(editorHtml)

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.focus()
    }
  }, [autoFocus])

  useEffect(() => {
    const nextHtml = normalizeRichContent(value)
    editorHtmlRef.current = nextHtml
    setEditorHtml(nextHtml)
    const editor = editorRef.current
    if (editor && editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml
    }
  }, [value])

  useEffect(() => {
    const nextMentionIds = mentionIds ?? []
    setCurrentMentionIds(nextMentionIds)
  }, [mentionIds])

  const syncFromEditor = () => {
    const editor = editorRef.current
    if (!editor) return

    const nextHtml = normalizeRichContent(editor.innerHTML)
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml
    }

    editorHtmlRef.current = nextHtml
    setEditorHtml(nextHtml)
    onChange(nextHtml)

    const extractedMentionIds = extractMentionIds(nextHtml)
    setCurrentMentionIds(extractedMentionIds)
    onMentionIdsChange?.(extractedMentionIds)
  }

  const saveSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      selectionRef.current = null
      return
    }

    const range = selection.getRangeAt(0)
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange()
    }
  }

  const restoreSelection = () => {
    const selection = window.getSelection()
    if (!selection || !selectionRef.current) return

    selection.removeAllRanges()
    selection.addRange(selectionRef.current)
  }

  const insertHtml = (html: string) => {
    const editor = editorRef.current
    if (!editor || disabled) return

    editor.focus()
    restoreSelection()
    document.execCommand('insertHTML', false, html)
    syncFromEditor()
  }

  const applyCommand = (command: string, value?: string) => {
    if (disabled) return
    const editor = editorRef.current
    if (!editor) return

    editor.focus()
    restoreSelection()
    document.execCommand(command, false, value)
    syncFromEditor()
  }

  const mentionUsers = (onRequestMentionSearch?.(mentionSearch) ?? users).filter((user) => {
    const keyword = mentionSearch.trim().toLowerCase()
    if (!keyword) return true
    return user.name.toLowerCase().includes(keyword) || user.id.toLowerCase().includes(keyword)
  })

  const handleSelectMention = (userId: string) => {
    const target = mentionUsers.find((user) => user.id === userId)
    if (!target) return

    const mentionHtml = `<span class="task-rich-input-mention" data-mention-id="${escapeAttr(target.id)}" contenteditable="false">@${escapeHtml(target.name)}</span>&nbsp;`
    insertHtml(mentionHtml)
    setMentionOpen(false)
    setMentionSearch('')
  }

  const handleLinkConfirm = () => {
    const href = sanitizeUrl(linkHref)
    if (!href) {
      message.error('请输入有效链接')
      return
    }

    const selectionText = selectionRef.current?.toString().trim() ?? ''
    const displayText = linkLabel.trim() || selectionText || href
    const linkHtml = `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(displayText)}</a>`
    insertHtml(linkHtml)
    setLinkOpen(false)
    setLinkLabel('')
    setLinkHref('')
  }

  const handleUploadAttachment = async (file: File) => {
    if (!onRequestAttachmentUpload) return false

    const fileNameError = getAttachmentFileNameValidationError(file.name)
    if (fileNameError) {
      message.error(fileNameError)
      return false
    }

    const created = await onRequestAttachmentUpload(file)
    if (created) {
      onAttachmentUploaded?.(created, 'upload')
    }
    if (mode === 'description' && created && isImageAttachment(created)) {
      const imageHtml = `<img src="${escapeAttr(buildAttachmentPreviewUrl(created))}" data-attachment-id="${escapeAttr(created.attachment_id)}" alt="${escapeAttr(created.file_name)}" />`
      insertHtml(imageHtml)
    }

    return false
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled || !onRequestAttachmentUpload) return

    const items = Array.from(event.clipboardData.items)
    const imageItems = items.filter((item) => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    event.preventDefault()

    void (async () => {
      for (const item of imageItems) {
        const file = item.getAsFile()
        if (!file) continue
        const fileNameError = getAttachmentFileNameValidationError(file.name)
        if (fileNameError) {
          message.error(fileNameError)
          continue
        }
        const created = await onRequestAttachmentUpload(file)
        if (created) {
          onAttachmentUploaded?.(created, 'paste')
        }
        if (mode === 'description' && created && isImageAttachment(created)) {
          const imageHtml = `<img src="${escapeAttr(buildAttachmentPreviewUrl(created))}" data-attachment-id="${escapeAttr(created.attachment_id)}" alt="${escapeAttr(created.file_name)}" />`
          insertHtml(imageHtml)
        }
      }
    })()
  }

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return

    if (event.key === '@') {
      event.preventDefault()
      saveSelection()
      setMentionOpen(true)
      setMentionSearch('')
      return
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      (mode === 'comment' || mode === 'comment-edit')
    ) {
      event.preventDefault()
      void onSubmit?.(editorHtmlRef.current, currentMentionIds)
      return
    }

    if (event.key === 'Escape') {
      setMentionOpen(false)
      setLinkOpen(false)
    }
  }

  const handleRootBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (mode !== 'description' || disabled) return
    const nextFocus = event.relatedTarget as Node | null
    if (
      nextFocus &&
      (wrapperRef.current?.contains(nextFocus) ||
        (nextFocus instanceof Element && nextFocus.closest('.task-rich-input-overlay')))
    ) {
      return
    }
    void onBlurCommit?.(editorHtmlRef.current, currentMentionIds)
  }

  const renderAttachmentItem = (attachment: ApiAttachment) => {
    const attachmentSource = attachmentOrigins[attachment.attachment_id] ?? 'upload'
    const ext = (attachment.file_name.split('.').pop() ?? '').toLowerCase()
    const sizeKB = attachment.file_size / 1024
    const sizeLabel =
      sizeKB >= 1024
        ? `${(sizeKB / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(sizeKB))} KB`

    if (attachmentSource === 'paste' && isImageAttachment(attachment)) {
      return (
        <div key={attachment.attachment_id} className="comment-image-preview-item">
          <button
            type="button"
            className="comment-image-card"
            onClick={() => onPreviewAttachment?.(attachment)}
          >
            <img
              className="comment-image-thumb"
              src={buildAttachmentPreviewUrl(attachment)}
              alt={attachment.file_name}
            />
          </button>
          {onRemoveAttachment && (
            <Button
              type="text"
              size="small"
              danger
              className="attachment-delete comment-image-delete"
              onClick={() => onRemoveAttachment(attachment.attachment_id)}
            >
              删除
            </Button>
          )}
        </div>
      )
    }

    return (
      <div key={attachment.attachment_id} className="detail-attachment-card">
        <div className="attachment-thumb">
          <span className="attachment-ext">{ext || 'FILE'}</span>
        </div>
        <div className="attachment-main">
          <div className="attachment-name" title={attachment.file_name}>
            {attachment.file_name}
          </div>
          <div className="attachment-meta">{sizeLabel}</div>
        </div>
        <div className="attachment-actions">
          {onPreviewAttachment && (
            <Button
              type="text"
              size="small"
              className="attachment-action"
              onClick={() => onPreviewAttachment?.(attachment)}
              icon={<EyeOutlined />}
              title="预览"
            />
          )}
          {onDownloadAttachment && (
            <Button
              type="text"
              size="small"
              className="attachment-action"
              onClick={() => onDownloadAttachment(attachment)}
              icon={<DownloadOutlined />}
              title="下载"
            />
          )}
          {onRemoveAttachment && (
            <Button
              type="text"
              size="small"
              danger
              className="attachment-delete"
              onClick={() => onRemoveAttachment(attachment.attachment_id)}
              icon={<DeleteOutlined />}
              title="删除"
            />
          )}
        </div>
      </div>
    )
  }

  const renderToolbar = () => (
    <div className="task-rich-input-toolbar" onMouseDown={(event) => event.preventDefault()}>
      <div className="task-rich-input-toolbar-left">
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<BoldOutlined />}
          title="加粗"
          onClick={() => applyCommand('bold')}
        />
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<StrikethroughOutlined />}
          title="删除线"
          onClick={() => applyCommand('strikeThrough')}
        />
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<ItalicOutlined />}
          title="斜体"
          onClick={() => applyCommand('italic')}
        />
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<UnderlineOutlined />}
          title="下划线"
          onClick={() => applyCommand('underline')}
        />
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<OrderedListOutlined />}
          title="有序列表"
          onClick={() => applyCommand('insertOrderedList')}
        />
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<UnorderedListOutlined />}
          title="无序列表"
          onClick={() => applyCommand('insertUnorderedList')}
        />
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<ContainerOutlined />}
          title="引用"
          onClick={() => applyCommand('formatBlock', 'blockquote')}
        />
      </div>
      <div className="task-rich-input-toolbar-right">
        <Button
          type="text"
          size="small"
          className="task-rich-input-tool-btn"
          icon={<SmileOutlined />}
          title="表情"
          onClick={() => message.info('表情功能开发中')}
        />
        <Popover
          open={mentionOpen}
          onOpenChange={setMentionOpen}
          trigger="click"
          placement="topLeft"
          overlayClassName="task-rich-input-overlay task-rich-input-mention-overlay"
          getPopupContainer={() => wrapperRef.current ?? document.body}
          content={
            <div className="task-rich-input-mention-panel">
              <Text strong>选择人员</Text>
              <Select
                size="small"
                autoFocus
                showSearch
                filterOption={false}
                placeholder="搜索并选择"
                value={undefined}
                onSearch={setMentionSearch}
                onChange={(nextValue: string) => handleSelectMention(nextValue)}
                options={mentionUsers.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                getPopupContainer={() => wrapperRef.current ?? document.body}
                style={{ width: '100%' }}
              />
            </div>
          }
        >
          <Button
            type="text"
            size="small"
            className="task-rich-input-tool-btn"
            icon={<MentionOutlined />}
            title="@ 选人"
            onMouseDown={(event) => {
              event.preventDefault()
              saveSelection()
            }}
            onClick={() => {
              setMentionOpen(true)
              setMentionSearch('')
            }}
          />
        </Popover>
        <Popover
          open={linkOpen}
          onOpenChange={setLinkOpen}
          trigger="click"
          placement="topLeft"
          overlayClassName="task-rich-input-overlay task-rich-input-link-overlay"
          getPopupContainer={() => wrapperRef.current ?? document.body}
          content={
            <div className="task-rich-input-link-popover">
              <Text strong>插入链接</Text>
              <Input
                size="small"
                placeholder="输入文本"
                value={linkLabel}
                onChange={(event) => setLinkLabel(event.target.value)}
              />
              <Input
                size="small"
                placeholder="粘贴或输入一个链接"
                value={linkHref}
                onChange={(event) => setLinkHref(event.target.value)}
                onPressEnter={handleLinkConfirm}
              />
              <Space size={8} className="task-rich-input-link-actions">
                <Button size="small" onClick={() => setLinkOpen(false)}>
                  取消
                </Button>
                <Button size="small" type="primary" onClick={handleLinkConfirm}>
                  确定
                </Button>
              </Space>
            </div>
          }
        >
          <Button
            type="text"
            size="small"
            className="task-rich-input-tool-btn"
            icon={<LinkOutlined />}
            title="插入链接"
            onMouseDown={(event) => {
              event.preventDefault()
              saveSelection()
              setLinkLabel(selectionRef.current?.toString().trim() ?? '')
            }}
            onClick={() => setLinkOpen(true)}
          />
        </Popover>
        <Upload
          multiple
          showUploadList={false}
          accept="image/*"
          disabled={disabled || !onRequestAttachmentUpload}
          beforeUpload={(file) => {
            void handleUploadAttachment(file as File)
            return false
          }}
        >
          <Button
            type="text"
            size="small"
            className="task-rich-input-tool-btn"
            icon={<PictureOutlined />}
            title="插入图片"
            disabled={disabled || !onRequestAttachmentUpload}
            loading={attachmentUploading}
          />
        </Upload>
        {mode !== 'description' && (
          <Upload
            multiple
            showUploadList={false}
            disabled={disabled || !onRequestAttachmentUpload}
            beforeUpload={(file) => {
              void handleUploadAttachment(file as File)
              return false
            }}
          >
            <Button
              type="text"
              size="small"
              className="task-rich-input-tool-btn"
              icon={<PaperClipOutlined />}
              title="添加附件"
              disabled={disabled || !onRequestAttachmentUpload}
              loading={attachmentUploading}
            />
          </Upload>
        )}
      </div>
      {(mode === 'comment' || mode === 'comment-edit') && (
        <>
          <span className="task-rich-input-toolbar-divider" />
          <Button
            type="text"
            size="small"
            className="task-rich-input-submit-btn"
            icon={<SendOutlined />}
            disabled={disabled || isRichContentEmpty(editorHtmlRef.current, attachments.length)}
            onClick={() => void onSubmit?.(editorHtmlRef.current, currentMentionIds)}
          >
            {submitLabel}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div
      ref={wrapperRef}
      className={className ? `task-rich-input ${className}` : 'task-rich-input'}
      onBlurCapture={handleRootBlur}
    >
      <Tooltip
        title={TASK_RICH_INPUT_TOOLTIP_TITLE[mode]}
        placement="topLeft"
        mouseEnterDelay={0.4}
        getPopupContainer={() => wrapperRef.current ?? document.body}
      >
        <div className="task-rich-input-shell">
          <div
            ref={editorRef}
            className="task-rich-input-editor"
            contentEditable={!disabled}
            suppressContentEditableWarning
            data-placeholder={placeholder}
            role="textbox"
            aria-multiline="true"
            onFocus={saveSelection}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onInput={syncFromEditor}
            onPaste={handlePaste}
            onKeyDown={handleEditorKeyDown}
          />
        </div>
      </Tooltip>
      {renderToolbar()}
      {attachments.length > 0 && (
        <div className="detail-attachment-list task-rich-input-attachment-list">
          {attachments.map((attachment) => renderAttachmentItem(attachment))}
        </div>
      )}
      {(mode === 'comment' || mode === 'comment-edit') && (
        <div className="task-rich-input-footer">
          <Text type="secondary" className="task-rich-input-hint">
            支持 @ 选人、链接和图片粘贴
          </Text>
        </div>
      )}
    </div>
  )
}
