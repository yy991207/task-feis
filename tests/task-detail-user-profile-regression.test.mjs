import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

async function testApiTypesAcceptUserProfileFields() {
  const taskServiceSource = await readSource('../src/services/taskService.ts')
  const commentServiceSource = await readSource('../src/services/commentService.ts')
  const teamServiceSource = await readSource('../src/services/teamService.ts')
  const taskTypeSource = await readSource('../src/types/task.ts')

  assert.match(
    taskServiceSource,
    /creator_name\?: string \| null/,
    '任务接口类型应该接住 creator_name，详情页不能只能显示 creator_id',
  )
  assert.match(
    taskServiceSource,
    /assignees\?: ApiUserProfile\[\]/,
    '任务接口类型应该接住 assignees 人员对象数组',
  )
  assert.match(
    taskServiceSource,
    /followers\?: ApiUserProfile\[\]/,
    '任务接口类型应该接住 followers 人员对象数组',
  )
  assert.match(
    commentServiceSource,
    /author_name\?: string \| null/,
    '评论接口类型应该接住 author_name，评论作者不能直接显示 author_id',
  )
  assert.match(
    commentServiceSource,
    /author_avatar_url\?: string \| null/,
    '评论接口类型应该接住 author_avatar_url，有头像地址时要能展示图片',
  )
  assert.match(
    teamServiceSource,
    /user_name\?: string \| null/,
    '团队成员接口类型应该接住 user_name，选人和详情兜底数据都要能显示中文名',
  )
  assert.match(
    teamServiceSource,
    /avatar_url\?: string \| null/,
    '团队成员接口类型应该接住 avatar_url，人员头像不能只能用首字母',
  )
  assert.match(
    taskTypeSource,
    /avatar\?: string/,
    '前端 User 类型应该继续保留头像字段，用于 Avatar src 展示',
  )
}

async function testTaskServiceMapsProfileFields() {
  const source = await readSource('../src/services/taskService.ts')

  assert.match(
    source,
    /function buildApiUserProfileMap\(api: ApiTask\): Map<string, ApiUserProfile>/,
    '任务映射应该先把接口返回的人员对象整理成按 user_id 查询的资料表',
  )
  assert.match(
    source,
    /name: profile\?\.user_name \?\? id/,
    '任务负责人和关注人成员名应该优先用 user_name，再兜底 user_id',
  )
  assert.match(
    source,
    /avatar: profile\?\.avatar_url \?\? undefined/,
    '任务成员头像应该从 avatar_url 映射到前端 avatar 字段',
  )
  assert.match(
    source,
    /creator: \{[\s\S]*name: api\.creator_name \?\? creatorProfile\?\.user_name \?\? api\.creator_id,[\s\S]*avatar: api\.creator_avatar_url \?\? creatorProfile\?\.avatar_url \?\? undefined/,
    '任务创建人应该优先使用 creator_name 和 creator_avatar_url',
  )
}

async function testTaskDetailUsesProfileDisplay() {
  const source = await readSource('../src/components/TaskDetailPanel/index.tsx')

  assert.match(
    source,
    /function getUserDisplayName\(user: Pick<User, 'id' \| 'name'>\): string/,
    '详情页应该统一通过 getUserDisplayName 取展示名，避免到处直接用 user_id',
  )
  assert.match(
    source,
    /function renderUserAvatar\(/,
    '详情页应该统一渲染人员头像，才能复用 avatar_url 和默认头像兜底',
  )
  assert.match(
    source,
    /src=\{normalizeAvatarSrc\(user\.avatar\)\}/,
    'Avatar 应该在 avatar_url 有有效值时使用 src 显示图片',
  )
  assert.match(
    source,
    /\{normalizeAvatarSrc\(user\.avatar\) \? null : fallback\}/,
    'avatar_url 为空时应该继续显示当前默认头像内容',
  )
  assert.match(
    source,
    /const creator: User = \{[\s\S]*name: task\.creator\.name \?\? task\.creator\.id,[\s\S]*avatar: task\.creator\.avatar/,
    '详情页创建人应该从 task.creator 里读取 name 和 avatar',
  )
  assert.match(
    source,
    /setAvailableUsers\(members\.map\(mapTeamMemberToUser\)\)/,
    '详情页团队成员列表应该用 user_name 和 avatar_url 转成前端 User',
  )
  assert.match(
    source,
    /const authorUser = resolveCommentAuthorUser\(comment\)/,
    '评论作者应该先解析 author_name 和 author_avatar_url，再渲染',
  )
  assert.match(
    source,
    /<span className="comment-author">\{getUserDisplayName\(authorUser\)\}<\/span>/,
    '评论作者展示应该显示 user_name，不应该直接显示 author_id',
  )
  assert.match(
    source,
    /@\$\{escapeHtml\(getUserDisplayName\(authorUser\)\)\}/,
    '回复评论时 @ 文案应该显示人名，data-mention-id 继续保留 user_id',
  )
  assert.doesNotMatch(
    source,
    /<span className="comment-author">\{authorId\}<\/span>/,
    '评论作者不应该再直接显示 author_id',
  )
}

async function main() {
  await testApiTypesAcceptUserProfileFields()
  await testTaskServiceMapsProfileFields()
  await testTaskDetailUsesProfileDisplay()
  console.log('task detail user profile regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
