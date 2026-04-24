import { appConfig } from '@/config/appConfig'
import type { TeamMember } from '@/services/teamService'
import type { Task } from '@/types/task'

export interface TaskCompletionAction {
  key: string
  label: string
  status: 'done' | 'todo'
  scope?: 'self' | 'all'
}

export interface TaskCompletionSummary {
  doneCount: number
  totalCount: number
}

export function getTaskCompletionSummary(task: Task): TaskCompletionSummary {
  const completions = task.assignee_completions ?? []
  if (completions.length > 0) {
    return {
      doneCount: completions.filter((item) => item.is_completed).length,
      totalCount: completions.length,
    }
  }

  const assigneeCount = task.members.filter((member) => member.role === 'assignee').length
  if (assigneeCount <= 0) {
    return { doneCount: task.status === 'done' ? 1 : 0, totalCount: 0 }
  }

  return { doneCount: task.status === 'done' ? assigneeCount : 0, totalCount: assigneeCount }
}

export function isCurrentUserTaskAssignee(task: Task): boolean {
  return task.members.some((member) => member.role === 'assignee' && member.id === appConfig.user_id)
}

export function isCurrentUserAssigneeCompleted(task: Task): boolean {
  const currentCompletion = task.assignee_completions?.find(
    (item) => item.user_id === appConfig.user_id,
  )
  if (currentCompletion) {
    return currentCompletion.is_completed
  }
  return isCurrentUserTaskAssignee(task) ? task.status === 'done' : false
}

export function isCurrentUserTaskAdmin(teamMembers: TeamMember[]): boolean {
  const currentMember = teamMembers.find((member) => member.user_id === appConfig.user_id)
  return currentMember?.role === 'owner' || currentMember?.role === 'admin'
}

export function canConfigureTaskCompletionMode(task: Task): boolean {
  const assigneeCount = task.members.filter((member) => member.role === 'assignee').length
  return assigneeCount > 1
}

export function getTaskCompletionActions(
  task: Task,
  teamMembers: TeamMember[],
): TaskCompletionAction[] {
  const assigneeCount = task.members.filter((member) => member.role === 'assignee').length
  const isDone = task.status === 'done'
  const isSelfCompleted = isCurrentUserAssigneeCompleted(task)
  const isAssignee = isCurrentUserTaskAssignee(task)
  const isAdmin = isCurrentUserTaskAdmin(teamMembers)
  const isAdminAndAssignee = isAdmin && isAssignee

  // 多人负责人场景：负责人可以操作自己的完成状态，管理员可以替所有人完成
  if (assigneeCount > 1 && isAssignee) {
    if (!isSelfCompleted) {
      return [
        { key: 'done:self', label: '仅我完成', status: 'done', scope: 'self' },
        ...(isAdmin
          ? [{ key: 'done:all', label: '为所有负责人完成', status: 'done', scope: 'all' as const }]
          : []),
      ]
    }
    return [
      { key: 'todo:self', label: '重启任务', status: 'todo', scope: 'self' },
      ...(isAdmin
        ? [{ key: 'done:all', label: '为所有负责人完成', status: 'done', scope: 'all' as const }]
        : []),
    ]
  }

  if (!isDone) {
    return [{ key: 'done', label: '标记完成', status: 'done' }]
  }

  return [{ key: 'todo', label: '重启任务', status: 'todo' }]
}
