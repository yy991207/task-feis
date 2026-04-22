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

async function readTaskDetailStyleSource() {
  return readFile(new URL('../src/components/TaskDetailPanel/index.less', import.meta.url), 'utf8')
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

async function testTaskDescriptionUsesReadOnlyViewUntilEditing() {
  const source = await readTaskDetailSource()
  const styleSource = await readTaskDetailStyleSource()

  assert.match(
    source,
    /const \[descriptionEditing, setDescriptionEditing\] = useState\(false\)/,
    '任务描述应该有独立的展示态开关，保存后回到只读展示',
  )
  assert.match(
    source,
    /<TaskRichText html=\{descriptionDraft\} className="detail-description-text" \/>/,
    '任务描述默认应该用只读富文本渲染，链接才能直接点击跳转',
  )
  assert.match(
    source,
    /setDescriptionEditing\(true\)/,
    '任务描述点击后应该切到编辑态，而不是一直保持输入框边框',
  )
  assert.match(
    source,
    /setDescriptionEditing\(false\)/,
    '任务描述保存后应该回到只读展示态，避免编辑边框残留',
  )
  assert.match(
    styleSource,
    /\.detail-description-view \{/,
    '任务描述只读态应该有独立容器样式，避免显示成输入框',
  )
  assert.match(
    styleSource,
    /\.detail-description-editor \{/,
    '任务描述编辑态应该保留单独样式，只在编辑时显示输入边框',
  )
  assert.match(
    styleSource,
    /\.detail-description-view \{[\s\S]*display: flow-root;[\s\S]*padding: 2px 0 16px;[\s\S]*min-height: 24px;/,
    '任务描述只读态应该给内容块留出底部间距，避免压到下面的字段',
  )
}

async function testTaskDescriptionMentionsRenderLikeComments() {
  const richInputSource = await readRichInputSource()
  const styleSource = await readTaskDetailStyleSource()

  assert.match(
    richInputSource,
    /function decoratePlainMentionsForReadOnly/,
    '只读富文本应该把普通文本里的 @人 包成 mention 样式，兼容旧描述内容',
  )
  assert.match(
    richInputSource,
    /closest\('\.task-rich-input-mention, a'\)/,
    '只读富文本高亮 @人 时不能重复包已有 mention，也不能改链接里的内容',
  )
  assert.match(
    richInputSource,
    /span\.className = 'task-rich-input-mention'/,
    '普通文本 @人 展示时应该复用评论区同一个 mention class',
  )
  assert.match(
    richInputSource,
    /const displayHtml = decoratePlainMentionsForReadOnly\(normalizedHtml\)[\s\S]*dangerouslySetInnerHTML=\{\{ __html: displayHtml \}\}/,
    'TaskRichText 只读展示应该使用补过 @人 高亮的 HTML',
  )
  assert.match(
    styleSource,
    /\.detail-description-text \{[\s\S]*\.task-rich-input-mention \{[\s\S]*background: #edf3ff;[\s\S]*color: #245bdb;/,
    '描述区 @人 应该明确使用和评论区一致的蓝色 mention 视觉',
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
  assert.doesNotMatch(
    source,
    /getAttachmentFileNameValidationError\(file\.name\)/,
    '统一输入框上传附件时不应该再拦截文件名空格，避免和当前上传需求冲突',
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
  assert.match(
    source,
    /focusVersion\?: number/,
    '统一输入框应该支持外部通过 focusVersion 主动触发聚焦，方便评论回复按钮把光标拉回输入框',
  )
}

async function testRichInputSubmitsCommentOnEnter() {
  const source = await readRichInputSource()
  const keydownStart = source.indexOf('const handleEditorKeyDown')
  const keydownEnd = source.indexOf('const handleRootBlur', keydownStart)
  const keydownSource = source.slice(keydownStart, keydownEnd)

  assert.ok(
    keydownStart !== -1 && keydownEnd !== -1,
    '统一输入框应该保留键盘处理入口，方便处理 @ 和 Escape 等快捷操作',
  )
  assert.match(
    keydownSource,
    /event\.key === 'Enter'/,
    '评论输入框应该拦截 Enter，支持直接发送评论或保存评论编辑',
  )
  assert.match(
    keydownSource,
    /mode === 'comment' \|\| mode === 'comment-edit'/,
    '只有评论输入和评论编辑模式才应该把 Enter 当成提交动作，不能影响描述区换行编辑',
  )
  assert.match(
    keydownSource,
    /event\.shiftKey/,
    '评论输入框应该允许 Shift+Enter 继续换行，不能把所有回车都拦成发送',
  )
  assert.match(
    keydownSource,
    /event\.nativeEvent\.isComposing/,
    '评论输入框需要跳过中文输入法组合态，避免用户上屏候选词时误发送',
  )
  assert.match(
    keydownSource,
    /isRichContentEmpty\(editorHtmlRef\.current, attachments\.length\)/,
    '评论输入框按 Enter 发送前应该复用现有空内容校验，避免发出空评论',
  )
  assert.match(
    keydownSource,
    /void onSubmit\?\.\(editorHtmlRef\.current, currentMentionIds\)/,
    '评论输入框按 Enter 时应该直接复用现有 onSubmit 提交流程',
  )
  assert.match(
    source,
    /Shift\+Enter 用于换行/,
    '发送按钮浮窗应该同步提示新的快捷键规则，避免用户误解',
  )
  assert.match(
    source,
    /onClick=\{\(\) => void onSubmit\?\.\(editorHtmlRef\.current, currentMentionIds\)\}/,
    '评论仍然应该保留点击发送按钮提交',
  )
}

async function testDescriptionEditorBlursOnOutsideClick() {
  const source = await readRichInputSource()

  assert.match(
    source,
    /document\.addEventListener\('pointerdown', handleDocumentPointerDown\)/,
    '描述输入框应该监听外部点击，避免浏览器没有自动触发 blur',
  )
  assert.match(
    source,
    /editorRef\.current\?\.blur\(\)/,
    '描述输入框点击组件外时应该主动让编辑器失焦',
  )
  assert.match(
    source,
    /mode !== 'description' \|\| disabled/,
    '只有描述模式才需要这条自动保存失焦逻辑',
  )
}

async function testRichInputProvidesToolbarTooltips() {
  const source = await readRichInputSource()

  assert.match(
    source,
    /import Tooltip from 'antd\/es\/tooltip'/,
    '任务详情输入框底部工具组件的鼠标浮窗提示应该使用 antd Tooltip',
  )
  const inputShellIndex = source.indexOf('<div className="task-rich-input-shell">')
  const previousTooltipOpenIndex = source.lastIndexOf('<Tooltip', inputShellIndex)
  const previousTooltipCloseIndex = source.lastIndexOf('</Tooltip>', inputShellIndex)
  assert.ok(
    inputShellIndex !== -1 && previousTooltipOpenIndex <= previousTooltipCloseIndex,
    '不能再把 Tooltip 包在整个输入框上，避免鼠标滑过编辑区就弹提示',
  )
  ;[
    '正文样式：加粗',
    '正文样式：斜体',
    '正文样式：下划线',
    '正文样式：有序列表',
    '正文样式：无序列表',
    '正文样式：引用',
    '表情：插入表情符号',
    '@ 提及：选择任务成员',
    '插入链接：添加网页地址',
    '添加图片：上传或粘贴图片',
    '添加评论附件：上传文件',
    '发送评论：提交当前内容',
  ].forEach((title) => {
    assert.match(
      source,
      new RegExp(`renderToolbarTooltip\\(\\s*'${title}`),
      `底部工具组件应该有“${title}”鼠标浮窗提示`,
    )
  })
  assert.doesNotMatch(
    source,
    /renderToolbarTooltip\(\s*'正文样式：删除线'/,
    '输入组件不应该再渲染删除线按钮和对应提示',
  )
  assert.doesNotMatch(
    source,
    /icon={<StrikethroughOutlined \/>}/,
    '输入组件工具栏不应该再显示删除线图标按钮',
  )
  assert.match(
    source,
    /renderToolbarTooltip\(\s*'正文样式：加粗'/,
    '格式按钮提示应该参考飞书样式，展示“组件作用：具体功能”的文字',
  )
  assert.match(
    source,
    /placement="top"/,
    '底部工具组件提示应该从按钮上方弹出，贴近参考图效果',
  )
}

async function testLinkPopoverInputsCanReceiveMouseDown() {
  const source = await readRichInputSource()
  const handlerStart = source.indexOf('const handleToolbarMouseDown')
  const handlerEnd = source.indexOf('const renderToolbar =', handlerStart)
  const handlerSource = source.slice(handlerStart, handlerEnd)

  assert.ok(
    handlerStart !== -1 && handlerEnd !== -1,
    '统一输入框工具栏应该用独立 mouseDown 处理函数，避免把弹层输入框事件也拦截掉',
  )
  assert.match(
    handlerSource,
    /closest\('\.task-rich-input-overlay'\)/,
    '链接弹层通过 React portal 渲染，mousedown 仍会冒泡到工具栏，工具栏需要识别并放过弹层内部事件',
  )
  assert.match(
    handlerSource,
    /closest\('\.task-rich-input-overlay'\)[\s\S]*return[\s\S]*event\.preventDefault\(\)/,
    '工具栏只能拦截自身按钮的默认聚焦行为，不能阻止链接弹层输入框获取焦点',
  )
  assert.match(
    source,
    /<div className="task-rich-input-toolbar" onMouseDown=\{handleToolbarMouseDown\}>/,
    '工具栏应该挂载安全的 mouseDown 处理函数，而不是继续内联无条件 preventDefault',
  )
}

async function testRichInputLinksCanOpenAndOverlayRendersAboveEditor() {
  const source = await readRichInputSource()
  const pointerDownStart = source.indexOf('const handleDocumentPointerDown')
  const pointerDownEnd = source.indexOf('document.addEventListener', pointerDownStart)
  const pointerDownSource = source.slice(pointerDownStart, pointerDownEnd)

  assert.match(
    source,
    /const getOverlayPopupContainer = \(\) => document\.body/,
    '链接和提及弹层应该优先挂到 document.body，避免在详情页底部输入区里被局部容器遮挡',
  )
  assert.match(
    source,
    /getPopupContainer=\{getOverlayPopupContainer\}/,
    '工具栏里的 Popover 和搜索下拉层应该统一复用 body 容器，保证浮层层级稳定',
  )
  assert.match(
    pointerDownSource,
    /closest\('\.task-rich-input-overlay'\)/,
    '描述输入框点击浮层内部时不应该误触发外部失焦保存，否则改到 body 后会一边编辑一边关闭弹层',
  )
  assert.match(
    source,
    /const handleEditorClick = \(event: MouseEvent<HTMLDivElement>\) => \{/,
    '统一输入框应该显式接管编辑区里的链接点击行为',
  )
  assert.match(
    source,
    /target\.closest\('a\[href\]'\)/,
    '点击编辑区里的链接时应该识别锚点元素，而不是当普通文本处理',
  )
  assert.match(
    source,
    /window\.open\(anchor\.href, '_blank', 'noopener,noreferrer'\)/,
    '点击编辑区里的链接后应该新开页面跳转',
  )
  assert.match(
    source,
    /onClick=\{handleEditorClick\}/,
    '富文本编辑区应该挂上链接点击处理，避免插入链接后只能看不能点',
  )
}

async function testRichInputSupportsEmojiInsertion() {
  const source = await readRichInputSource()
  const styleSource = await readRichInputStyleSource()
  const emojiCount = source.match(/String\.fromCodePoint/g)?.length ?? 0

  assert.match(
    source,
    /const TASK_RICH_INPUT_EMOJIS = \[/,
    '统一输入框应该内置一组常用表情，不依赖还不存在的 antd 表情选择器',
  )
  assert.ok(
    emojiCount >= 56,
    '表情面板不能只提供十几个表情，至少应该覆盖 56 个常用表情',
  )
  assert.match(
    source,
    /const \[emojiOpen, setEmojiOpen\] = useState\(false\)/,
    '表情按钮应该打开一个可控的 antd Popover，而不是只弹开发中提示',
  )
  assert.match(
    source,
    /const handleSelectEmoji = \(emoji: string\) => \{[\s\S]*insertHtml\(escapeHtml\(emoji\)\)/,
    '选择表情后应该把表情插入当前富文本光标位置',
  )
  assert.match(
    source,
    /overlayClassName="task-rich-input-overlay task-rich-input-emoji-overlay"/,
    '表情选择面板应该复用统一的浮层容器，避免描述自动保存误触发',
  )
  assert.doesNotMatch(
    source,
    /message\.info\('表情功能开发中'\)/,
    '表情按钮不能继续停留在开发中提示，应该真正可输入表情',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-emoji-panel \{/,
    '表情选择面板应该有独立样式，避免直接堆一排按钮',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-emoji-grid \{/,
    '表情选择面板应该使用网格布局展示常用表情',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-emoji-grid \{[\s\S]*max-height: 220px;[\s\S]*overflow-y: auto;/,
    '扩充表情后面板应该支持内部滚动，避免弹层撑得太高',
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
    /\.task-rich-input-tooltip-title \{/,
    '统一输入框底部工具提示应该有独立样式，保证接近飞书黑色浮层效果',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-tooltip-hint \{/,
    '统一输入框底部工具提示应该支持第二行辅助说明',
  )
  assert.match(
    styleSource,
    /\.task-rich-input-editor \{[\s\S]*min-height: 112px;/,
    '描述输入框应该提供接近参考图的大编辑区，不能退回单行评论输入',
  )
}

async function testCommentComposerLayoutFitsPanelAndGrowsWithContent() {
  const source = await readRichInputSource()
  const richInputStyleSource = await readRichInputStyleSource()
  const detailStyleSource = await readTaskDetailStyleSource()
  const detailSource = await readTaskDetailSource()

  assert.doesNotMatch(
    source,
    /支持 @ 选人、链接和图片粘贴/,
    '评论输入框底部不应该再显示固定提示文字，避免占用底部空间',
  )
  assert.doesNotMatch(
    source,
    /task-rich-input-footer/,
    '评论输入框不应该再渲染额外 footer，底部只保留工具栏和发送按钮',
  )
  assert.match(
    detailStyleSource,
    /\.detail-footer \{[\s\S]*padding: 12px 16px 14px;/,
    '详情页底部评论区应该有左右内边距，避免输入框边界贴住详情面板',
  )
  assert.match(
    detailStyleSource,
    /\.comment-input-wrapper \{[\s\S]*width: 100%;[\s\S]*min-width: 0;/,
    '评论输入框外层应该限制在底部容器内，避免和侧边栏边界重合',
  )
  assert.match(
    detailSource,
    /const DETAIL_PANEL_DEFAULT_WIDTH = 460/,
    '任务详情面板默认宽度应该加大到 460，避免底部发送按钮被挤出可视区域',
  )
  assert.match(
    detailSource,
    /const DETAIL_PANEL_MIN_WIDTH = 440/,
    '任务详情面板最小宽度应该不小于 440，拖拽后也不能挤掉发送按钮',
  )
  assert.match(
    detailSource,
    /useState\(DETAIL_PANEL_DEFAULT_WIDTH\)/,
    '任务详情面板初始宽度应该使用统一默认宽度常量',
  )
  assert.match(
    detailSource,
    /Math\.min\(\s*DETAIL_PANEL_MAX_WIDTH,\s*Math\.max\(DETAIL_PANEL_MIN_WIDTH, nextWidth\),\s*\)/,
    '任务详情面板拖拽宽度应该用统一最小和最大宽度限制',
  )
  assert.match(
    richInputStyleSource,
    /\.comment-input-wrapper \{[\s\S]*\.task-rich-input-editor \{[\s\S]*min-height: 72px;[\s\S]*max-height: 180px;[\s\S]*overflow-y: auto;/,
    '评论输入框应该允许多行内容撑高，并在超过上限后通过内部滚动查看',
  )
}

async function main() {
  await testTaskDetailUsesSharedRichInput()
  await testTaskDescriptionUsesReadOnlyViewUntilEditing()
  await testTaskDescriptionMentionsRenderLikeComments()
  await testRichInputSupportsMentionLinkAndPasteImage()
  await testRichInputSubmitsCommentOnEnter()
  await testDescriptionEditorBlursOnOutsideClick()
  await testRichInputProvidesToolbarTooltips()
  await testLinkPopoverInputsCanReceiveMouseDown()
  await testRichInputLinksCanOpenAndOverlayRendersAboveEditor()
  await testRichInputSupportsEmojiInsertion()
  await testCommentComposerAttachmentsUseFileCardLayout()
  await testRichInputProvidesLinkPopoverAndMentionPanelStyles()
  await testCommentComposerLayoutFitsPanelAndGrowsWithContent()
  console.log('task detail rich input regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
