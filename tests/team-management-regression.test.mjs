import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function testTeamServiceExposesMemberApis() {
  const service = await readFile(new URL('../src/services/teamService.ts', import.meta.url), 'utf8')

  assert.ok(service.includes('listMembers('), 'teamService 应该提供按团队查询成员的方法')
  assert.ok(service.includes('addMembers('), 'teamService 应该提供添加成员的方法')
  assert.ok(service.includes('updateMemberRole('), 'teamService 应该提供调整成员角色的方法')
  assert.ok(service.includes('removeMember('), 'teamService 应该提供移除成员的方法')
  assert.ok(service.includes('transferOwner('), 'teamService 应该提供转让 owner 的方法')
}

async function testTeamsManagerModalUsesMemberApis() {
  const modal = await readFile(new URL('../src/components/TeamsManagerModal/index.tsx', import.meta.url), 'utf8')

  assert.ok(modal.includes('listMembers('), '团队管理弹窗打开成员管理时应该加载成员列表')
  assert.ok(modal.includes('addMembers('), '团队管理弹窗应该接入添加成员接口')
  assert.ok(modal.includes('updateMemberRole('), '团队管理弹窗应该接入调整角色接口')
  assert.ok(modal.includes('removeMember('), '团队管理弹窗应该接入移除成员接口')
  assert.ok(modal.includes('transferOwner('), '团队管理弹窗应该接入转让 Owner 接口')
  assert.ok(modal.includes('团队配置'), '团队管理弹窗应该在同一个页面展示团队配置')
  assert.ok(modal.includes('成员配置'), '团队管理弹窗应该在同一个页面展示成员配置')
  assert.ok(modal.includes("import Row from 'antd/es/row'"), '团队管理弹窗应该使用 AntD Row 做整体布局')
  assert.ok(modal.includes("import Col from 'antd/es/col'"), '团队管理弹窗应该使用 AntD Col 做分栏布局')
  assert.ok(modal.includes("import Card from 'antd/es/card'"), '团队管理弹窗应该使用 AntD Card 承载配置区')
  assert.ok(modal.includes("import Empty from 'antd/es/empty'"), '团队管理弹窗应该使用 AntD Empty 展示空状态')
  assert.ok(modal.includes('添加成员'), '成员管理界面应该有添加成员入口')
  assert.ok(modal.includes('调整角色'), '成员管理界面应该有调整角色入口')
  assert.ok(modal.includes('转让 Owner'), '成员管理界面应该有转让 Owner 入口')
  assert.equal(
    modal.includes('返回团队列表'),
    false,
    '团队和成员配置应该合并到同一页面，不应再出现二级成员管理返回入口',
  )
}

async function main() {
  await testTeamServiceExposesMemberApis()
  await testTeamsManagerModalUsesMemberApis()
  console.log('team management regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
