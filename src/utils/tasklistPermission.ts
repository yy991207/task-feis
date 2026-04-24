import type { Tasklist } from '@/types/task'

export function canCurrentUserCreateInTasklist(
  tasklist: Tasklist | undefined,
  userId: string,
): boolean {
  if (!tasklist || !userId) {
    return false
  }
  return tasklist.creator.id === userId
}
