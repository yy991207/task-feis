import type { Tasklist } from '@/types/task'

export function canCurrentUserCreateInTasklist(
  tasklist: Tasklist | undefined,
  userId: string,
): boolean {
  // 当前只收口创建动作：任务分组、任务和子任务都只允许清单创建者发起。
  if (!tasklist || !userId) {
    return false
  }
  return tasklist.creator.id === userId
}
