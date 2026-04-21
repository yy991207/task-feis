import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskDetailSource() {
  return readFile(new URL('../src/components/TaskDetailPanel/index.tsx', import.meta.url), 'utf8')
}

async function readRichInputSource() {
  return readFile(new URL('../src/components/TaskRichInput/index.tsx', import.meta.url), 'utf8')
}

async function readRichInputStyleSource() {
  return readFile(new URL('../src/components/TaskRichInput/index.less', import.meta.url), 'utf8')
}

async function testTaskDetailUsesSharedRichInput() {
  const source = await readTaskDetailSource()

  assert.match(
    source,
    /import TaskRichInput, \{[\s\S]*TaskRichText[\s\S]*\} from '@\/components\/TaskRichInput'/,
    '任务详情应该引入统一的 TaskRichInput 组件，不能再让描述和评论各写一套输入框',
  )
  assert.match(
    source,
    /<TaskRichInput[\s\S]*mode="description"/,
    '描述区应该改成复用统一输入框组件',
  )
  assert.match(
    source,
    /<TaskRichInput[\s\S]*mode="comment"/,
    '评论区应该改成复用统一输入框组件',
  )
  assert.match(
    source,
    /<TaskRichInput[\s\S]*mode="comment-edit"/,
    '评论编辑态也应该复用统一输入框组件，避免三套输入逻辑继续分叉',
  )
}

async function testRichInputSupportsMentionLinkAndPasteImage() {
  const source = await readRichInputSource()

  assert.match(
    source,
    /contentEditable/,
    '统一输入框应该提供可编辑的富文本区域',
  )
  assert.match(
    source,
    /MentionOutlined/,
    '统一输入框工具栏应该提供 @ 选人入口',
  )
  assert.match(
    source,
    /LinkOutlined/,
    '统一输入框工具栏应该提供链接入口',
  )
  assert.match(
    source,
    /PictureOutlined/,
    '统一输入框工具栏应该提供图片入口',
  )
  assert.match(
    source,
    /onPaste=\{handlePaste\}/,
    '统一输入框应该显式接住粘贴事件，支持图片粘贴',
  )
  assert.match(
    source,
    /event\.clipboardData\.items/,
    '统一输入框处理粘贴图片时应该读取 clipboardData.items',
  )
  assert.match(
    source,
    /onRequestMentionSearch/,
    '统一输入框应该给任务详情透出 @ 选人的数据能力，而不是把选人逻辑写死',
  )
  assert.match(
    source,
    /onRequestAttachmentUpload/,
    '统一输入框应该把图片上传能力透出给上层复用现有附件接口',
  )
  assert.match(
    source,
    /getAttachmentFileNameValidationError\(file\.name\)/,
    '统一输入框应该先拦截带空格的附件文件名，避免继续走上传和 preview',
  )
  assert.match(
    source,
    /if \(mode === 'description' && created && isImageAttachment\(created\)\)/,
    '描述模式仍然应该保留粘贴图片后插入正文的逻辑，不能和评论附件渲染混在一起',
  )
  assert.match(
    source,
    /onSubmit/,
    '统一输入框应该支持提交动作，给评论发送和描述保存共用',
  )
}

async function testRichInputProvidesModeAwareHoverTooltip() {
  const source = await readRichInputSource()

  assert.match(
    source,
    /import Tooltip from 'antd\/es\/tooltip'/,
    '任务详情输入框的鼠标浮窗提示应该使用 antd Tooltip',
  )
  assert.match(
    source,
    /TASK_RICH_INPUT_TOOLTIP_TITLE/,
    '统一输入框应该按 description、comment、comment-edit 区分提示内容',
  )
  assert.match(
    source,
    /任务描述输入框/,
    '描述输入框浮窗应该说明这是用于编辑任务描述的组件',
  )
  assert.match(
    source,
    /评论输入框/,
    '评论输入框浮窗应该说明这是用于补充任务评论的组件',
  )
  assert.match(
    source,
    /评论编辑输入框/,
    '评论编辑态浮窗应该说明这是用于修改已有评论的组件',
  )
  assert.match(
    source,
    /<Tooltip[\s\S]*title=\{TASK_RICH_INPUT_TOOLTIP_TITLE\[mode\]\}[\s\S]*placement="topLeft"/,
    '鼠标移到输入区域时应该展示当前组件用途提示',
  )
}

async function testCommentComposerAttachmentsUseFileCardLayout() {
  const source = await readRichInputSource()

  assert.match(
    source,
    /EyeOutlined/,
    '评论输入框附件应该提供预览眼睛图标',
  )
  assert.match(
    source,
    /<div key=\{attachment\.attachment_id\} className="detail-attachment-card">/,
    '评论输入框附件应该复用文件卡片布局，而不是图片缩略图卡片',
  )
  assert.match(
    source,
    /icon={<DownloadOutlined \/>}/,
    '评论输入框附件应该提供下载箭头图标',
  )
  assert.match(
    source,
    /const attachmentSource = attachmentOrigins\[attachment\.attachment_id\] \?\? 'upload'/,
    '评论输入框附件应该能区分上传来源和粘贴来源',
  )
  assert.match(
    source,
    /if \(attachmentSource === 'paste' && isImageAttachment\(attachment\)\)/,
    '评论输入框里的粘贴图片仍然应该保留缩略图渲染',
  )
  assert.match(
    source,
    /className="comment-image-card"/,
    '评论输入框里的粘贴图片应该继续使用图片缩略图卡片',
  )
}

async function testRichInputProvidesLinkPopoverAndMentionPanelStyles() {
  const styleSource = await readRichInputStyleSource()

  assert.match(
    styleSource,
    /\.task-rich-input \{/,
    '统一输入框应该有独立容器样式',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-toolbar \{/,
    '统一输入框应该有底部工具栏样式',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-link-popover \{/,
    '统一输入框应该有链接弹层样式',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-mention-panel \{/,
    '统一输入框应该有 @ 选人面板样式',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-editor \{[\s\S]*min-height: 112px;/,
    '描述输入框应该提供接近参考图的大编辑区，不能退回单行评论输入',
  )
}

async function main() {
  await testTaskDetailUsesSharedRichInput()
  await testRichInputSupportsMentionLinkAndPasteImage()
  await testRichInputProvidesModeAwareHoverTooltip()
  await testCommentComposerAttachmentsUseFileCardLayout()
  await testRichInputProvidesLinkPopoverAndMentionPanelStyles()
  console.log('task detail rich input regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
