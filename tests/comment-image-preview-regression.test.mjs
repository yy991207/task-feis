import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readTaskDetailSource() {
  return readFile(new URL('../src/components/TaskDetailPanel/index.tsx', import.meta.url), 'utf8')
}

async function readAttachmentServiceSource() {
  return readFile(new URL('../src/services/attachmentService.ts', import.meta.url), 'utf8')
}

async function readFilePreviewRendererSource() {
  return readFile(new URL('../src/components/file-preview/file-preview-renderer.tsx', import.meta.url), 'utf8')
}

async function readTaskDetailStyleSource() {
  return readFile(new URL('../src/components/TaskDetailPanel/index.less', import.meta.url), 'utf8')
}

async function testCommentInputSupportsPasteImageUpload() {
  const source = await readTaskDetailSource()

  assert.match(
    source,
    /const handleCommentPaste = \(/,
    '评论输入区应该有独立的粘贴处理函数，专门接住图片粘贴',
  )
  assert.match(
    source,
    /event\.clipboardData\.items/,
    '评论输入区粘贴图片时应该读取 clipboardData.items',
  )
  assert.match(
    source,
    /void handleCommentAttachmentUpload\(file\)/,
    '粘贴出来的图片文件应该直接复用评论附件上传逻辑',
  )
  assert.match(
    source,
    /<Input\.TextArea[\s\S]*onPaste=\{handleCommentPaste\}/,
    '评论输入区应该换成支持粘贴事件的 TextArea 输入组件',
  )
}

async function testCommentAttachmentsRenderInlineImagePreview() {
  const source = await readTaskDetailSource()
  const styleSource = await readTaskDetailStyleSource()

  assert.match(
    source,
    /isImageAttachment\(att\)/,
    '评论附件渲染时应该先判断是不是图片附件',
  )
  assert.match(
    source,
    /className="comment-image-card"/,
    '评论区图片附件应该渲染单独的图片预览卡片',
  )
  assert.match(
    source,
    /setPreviewAttachment\(att\)/,
    '点击评论区图片附件时应该打开预览态',
  )
  assert.match(
    styleSource,
    /\.comment-image-card \{[\s\S]*width: 160px;[\s\S]*height: 108px;/,
    '评论区图片附件应该用固定缩略图尺寸展示，不能按原图尺寸撑开评论区',
  )
  assert.match(
    styleSource,
    /\.comment-image-thumb \{[\s\S]*object-fit: cover;/,
    '评论区图片缩略图应该裁切填充卡片，避免大图溢出',
  )
}

async function testTaskAttachmentsExposePreviewAndDownloadActions() {
  const source = await readTaskDetailSource()
  const styleSource = await readTaskDetailStyleSource()

  assert.match(
    source,
    /EyeOutlined/,
    '任务附件卡片应该提供预览动作图标',
  )
  assert.match(
    source,
    /DownloadOutlined/,
    '任务附件卡片应该提供下载动作图标',
  )
  assert.match(
    source,
    /onClick=\{\(\) => setPreviewAttachment\(att\)\}/,
    '点击任务附件的预览图标应该打开预览态',
  )
  assert.match(
    source,
    /onClick=\{\(\) => void handleAttachmentDownload\(att\)\}/,
    '点击任务附件的下载图标应该走下载接口',
  )
  assert.match(
    styleSource,
    /\.attachment-actions \{/,
    '任务附件卡片应该有独立的动作区样式',
  )
  assert.match(
    source,
    /const \[previewContent, setPreviewContent\] = useState\(''\)/,
    '任务附件预览弹层应该维护独立的 preview 内容状态',
  )
  assert.match(
    source,
    /const \[previewLoading, setPreviewLoading\] = useState\(false\)/,
    '任务附件预览弹层应该维护独立的 preview loading 状态',
  )
  assert.match(
    source,
    /fetch\(buildAttachmentPreviewUrl\(previewAttachment\)/,
    '打开任务附件预览时应该显式请求 preview 接口',
  )
  assert.match(
    source,
    /response\.blob\(\)/,
    '图片附件预览应该通过 preview 接口取 blob，而不是只依赖 img src 隐式加载',
  )
  assert.match(
    source,
    /content=\{previewContent\}/,
    '文件预览组件应该接收真实的 preview 内容',
  )
  assert.match(
    source,
    /loading=\{previewLoading\}/,
    '文件预览组件应该接收真实的 preview loading 状态',
  )
}

async function testAttachmentPreviewUsesServiceHelpers() {
  const source = await readAttachmentServiceSource()

  assert.match(
    source,
    /export function buildAttachmentPreviewUrl\(attachment: ApiAttachment\): string/,
    '附件服务应该通过完整附件对象构造预览 URL，不能只拿 attachment_id 拼下载接口',
  )
  assert.match(
    source,
    /api\/v1\/chat\/files\/preview\?url=/,
    '附件预览应该走通用 preview 接口，而不是 download 接口',
  )
  assert.match(
    source,
    /function getAttachmentPreviewSourceUrl\(attachment: ApiAttachment\): string/,
    '附件服务应该集中提取真实可预览 URL，避免 preview 接口收到 url=undefined',
  )
  assert.match(
    source,
    /attachment\.download_url[\s\S]*attachment\.url[\s\S]*attachment\.file_url[\s\S]*attachment\.final_url/,
    '附件服务应该优先使用后端 list/get 返回的 download_url，再兜底其他 URL 字段',
  )
  assert.match(
    source,
    /content_type\?: string \| null/,
    '附件模型应该兼容后端返回的 content_type 字段',
  )
  assert.match(
    source,
    /is_image\?: boolean/,
    '附件模型应该兼容后端返回的 is_image 字段',
  )
  assert.match(
    source,
    /attachment\.is_image === true/,
    '图片判断应该优先使用后端返回的 is_image 字段',
  )
  assert.match(
    source,
    /attachment\.content_type\?\.startsWith\('image\/'\)/,
    '图片判断应该兼容后端返回的 content_type 字段',
  )
  assert.match(
    source,
    /buildAttachmentDownloadUrl\(attachment\.attachment_id\)/,
    '原始文件 URL 缺失时应该用附件下载地址作为 preview 接口 url 参数兜底，而不是传 undefined',
  )
  assert.match(
    source,
    /presigned\.final_url/,
    '评论刚上传完成的附件应该保留 presign 返回的 final_url，避免 complete 响应缺字段时无法预览',
  )
  assert.match(
    source,
    /export function isImageAttachment\(attachment: ApiAttachment \| null \| undefined\): boolean/,
    '附件服务应该提供图片类型判断函数，避免评论区自己重复拼类型判断',
  )
}

async function testTaskDetailUsesSharedFilePreviewRenderer() {
  const detailSource = await readTaskDetailSource()
  const rendererSource = await readFilePreviewRendererSource()

  assert.match(
    detailSource,
    /import \{ FilePreviewRenderer \} from '@\/components\/file-preview'/,
    '任务详情评论区应该复用已有 file-preview 模块入口',
  )
  assert.match(
    detailSource,
    /buildAttachmentPreviewUrl\(previewAttachment\)/,
    '图片预览时应该把完整附件对象交给附件服务构造 preview URL',
  )
  assert.match(
    rendererSource,
    /if \(isImage && imageUrl\) \{/,
    '共享预览组件应该支持图片类型直接渲染',
  )
}

async function main() {
  await testCommentInputSupportsPasteImageUpload()
  await testCommentAttachmentsRenderInlineImagePreview()
  await testTaskAttachmentsExposePreviewAndDownloadActions()
  await testAttachmentPreviewUsesServiceHelpers()
  await testTaskDetailUsesSharedFilePreviewRenderer()
  console.log('comment image preview regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
