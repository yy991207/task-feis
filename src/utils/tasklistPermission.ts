import type { Tasklist } from '@/types/task'

export function canCurrentUserManageTasklist(
  tasklist: Tasklist | undefined,
  userId: string,
): boolean {
  // 当前清单下的任务配置、分组配置和详情编辑统一只允许清单创建者本人修改。
  if (!tasklist || !userId) {
    return false
  }
  return tasklist.creator.id === userId
}

export function canCurrentUserCreateInTasklist(
  tasklist: Tasklist | undefined,
  userId: string,
): boolean {
  // 当前只收口创建动作：任务分组、任务和子任务都只允许清单创建者发起。
  return canCurrentUserManageTasklist(tasklist, userId)
}
