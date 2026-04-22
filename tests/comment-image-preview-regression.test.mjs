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
    /import TaskRichInput, \{[\s\S]*TaskRichText[\s\S]*\} from '@\/components\/TaskRichInput'/,
    '任务详情应该复用统一的 TaskRichInput 输入框，而不是继续保留单独的评论 TextArea',
  )
  assert.match(
    source,
    /<TaskRichInput[\s\S]*mode="comment"/,
    '评论输入区应该换成统一的 TaskRichInput 组件',
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
    /handleOpenAttachmentPreview\(att\)/,
    '点击评论区图片附件时应该通过统一预览处理函数打开预览态',
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
    /const handleOpenAttachmentPreview = \(attachment: ApiAttachment\) => \{/,
    '任务详情应该提供统一的附件预览处理函数',
  )
  assert.match(
    source,
    /onClick=\{\(\) => handleOpenAttachmentPreview\(att\)\}/,
    '点击任务附件的预览图标应该走统一预览处理函数',
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

async function testTaskDetailAvatarsUseTaskTablePurple() {
  const source = await readTaskDetailSource()

  assert.doesNotMatch(
    source,
    /backgroundColor: '#f5a623'/,
    '任务详情页头像颜色应该和主页面一致使用紫色，不能再出现橙色头像',
  )
  assert.match(
    source,
    /backgroundColor: '#7b67ee'/,
    '任务详情页头像应该使用主页面同款紫色',
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

async function testAttachmentUploadsAllowWhitespaceFileNames() {
  const detailSource = await readTaskDetailSource()
  const serviceSource = await readAttachmentServiceSource()

  assert.doesNotMatch(
    serviceSource,
    /getAttachmentFileNameValidationError/,
    '附件服务不应该再保留文件名空格校验 helper',
  )
  assert.doesNotMatch(
    detailSource,
    /getAttachmentFileNameValidationError\(file\.name\)/,
    '任务详情上传入口不应该再拦截带空格的文件名',
  )
  assert.doesNotMatch(
    serviceSource,
    /文件名包含空格，请修改名称后再上传/,
    '上传流程不应该再提示文件名空格非法',
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

async function testCommentListAutoScrollsToLatestAfterSend() {
  const detailSource = await readTaskDetailSource()

  assert.match(
    detailSource,
    /const detailScrollRef = useRef<HTMLDivElement \| null>\(null\)/,
    '任务详情应该拿到评论区滚动容器 ref，评论发送后才能主动滚到底部',
  )
  assert.match(
    detailSource,
    /const pendingCommentScrollRef = useRef\(false\)/,
    '任务详情应该用独立标记控制评论发送后的自动滚动，避免每次渲染都强制跳到底部',
  )
  assert.match(
    detailSource,
    /pendingCommentScrollRef\.current = true[\s\S]*setComments\(\(prev\) => \[\.\.\.prev, created\]\)/,
    '评论发送成功后应该先标记自动滚动，再把新评论追加到列表',
  )
  assert.match(
    detailSource,
    /useEffect\(\(\) => \{[\s\S]*if \(!pendingCommentScrollRef\.current\) return[\s\S]*detailScrollRef\.current[\s\S]*scrollTo\(\{ top: detailScrollRef\.current\.scrollHeight/,
    '评论列表更新后应该把详情页滚动容器滚到最底部，方便立即看到最新评论',
  )
  assert.match(
    detailSource,
    /<div className="detail-scroll" ref=\{detailScrollRef\}>/,
    '详情页滚动容器应该挂载 detailScrollRef，不能只在评论列表内部滚动',
  )
}

async function testCommentCardsSupportReplyPrefill() {
  const detailSource = await readTaskDetailSource()
  const styleSource = await readTaskDetailStyleSource()

  assert.match(
    detailSource,
    /const handleReplyComment = \(comment: ApiComment\) => \{/,
    '任务详情应该提供单独的评论回复处理函数，避免把回复预填逻辑散落到 JSX 里',
  )
  assert.match(
    detailSource,
    /const \[commentFocusVersion, setCommentFocusVersion\] = useState\(0\)/,
    '评论回复后应该通过独立 focusVersion 让底部输入框重新聚焦',
  )
  assert.match(
    detailSource,
    /setCommentMentions\(\(prev\) => .*comment\.author_id.*comment\.user_id/s,
    '点击评论按钮后应该把目标评论作者加入 mentionIds，后续发送时一起提交给评论接口',
  )
  assert.match(
    detailSource,
    /const mentionHtml = `\<span class="task-rich-input-mention"[\s\S]*setCommentValue\(\(prev\) => \{[\s\S]*return `\$\{nextValue\}\$\{mentionHtml\}`/s,
    '点击评论按钮后应该把 @ 目标评论作者插入到底部评论输入框内容里',
  )
  assert.match(
    detailSource,
    /评论当前评论/,
    '每条评论卡片应该提供“评论当前评论”按钮提示',
  )
  assert.match(
    detailSource,
    /<div className="comment-meta">[\s\S]*className="comment-time"[\s\S]*className="comment-reply-btn"[\s\S]*className="comment-more-btn"/,
    '评论按钮和更多按钮应该和时间放在同一行，靠右显示在评论头部',
  )
  assert.doesNotMatch(
    detailSource,
    /<div className="comment-meta">[\s\S]*<\/div>[\s\S]*<div className="comment-actions">/s,
    '评论动作区不应该再单独占一行放在头部信息下面',
  )
  assert.match(
    detailSource,
    /className="comment-reply-btn"/,
    '评论互动按钮应该有独立样式类，避免和更多操作按钮混在一起',
  )
  assert.match(
    detailSource,
    /setCommentFocusVersion\(\(prev\) => prev \+ 1\)/,
    '点击评论按钮后应该主动递增 focusVersion，让底部输入框光标回到编辑区',
  )
  assert.match(
    styleSource,
    /\.comment-actions \{/,
    '评论动作区应该有独立布局样式，方便把按钮放到正文上方同一行',
  )
  assert.match(
    detailSource,
    /<TaskRichInput[\s\S]*mode="comment"[\s\S]*focusVersion=\{commentFocusVersion\}[\s\S]*mentionIds=\{commentMentions\}/,
    '底部评论输入框应该继续走统一输入组件，并接住回复预填后的 mentionIds',
  )
}

async function main() {
  await testCommentInputSupportsPasteImageUpload()
  await testCommentAttachmentsRenderInlineImagePreview()
  await testTaskAttachmentsExposePreviewAndDownloadActions()
  await testTaskDetailAvatarsUseTaskTablePurple()
  await testAttachmentPreviewUsesServiceHelpers()
  await testAttachmentUploadsAllowWhitespaceFileNames()
  await testTaskDetailUsesSharedFilePreviewRenderer()
  await testCommentListAutoScrollsToLatestAfterSend()
  await testCommentCardsSupportReplyPrefill()
  console.log('comment image preview regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
