import { appConfig } from '@/config/appConfig'
import type { TeamMember } from '@/services/teamService'
import type { Task, Tasklist } from '@/types/task'
import {
  type TaskCompletionAction,
  type TaskCompletionConfirm,
  type TaskCompletionPolicyContext,
  type TaskCompletionTriggerState,
  getTaskCompletionActions as getTaskCompletionActionsByPolicy,
  getTaskCompletionConfirm as getTaskCompletionConfirmByPolicy,
  getTaskCompletionTriggerState as getTaskCompletionTriggerStateByPolicy,
  isCurrentUserAssigneeCompleted as isCurrentUserAssigneeCompletedByPolicy,
  isCurrentUserTaskAssignee as isCurrentUserTaskAssigneeByPolicy,
} from './taskCompletionPolicy'

export interface TaskCompletionSummary {
  doneCount: number
  totalCount: number
}

function buildPolicyContext(tasklist?: Tasklist | null): TaskCompletionPolicyContext {
  return {
    currentUserId: appConfig.user_id,
    tasklistCreatorId: tasklist?.creator.id ?? null,
  }
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

export type { TaskCompletionAction, TaskCompletionConfirm, TaskCompletionTriggerState }

export function isCurrentUserTaskAssignee(task: Task): boolean {
  return isCurrentUserTaskAssigneeByPolicy(task, buildPolicyContext())
}

export function isCurrentUserAssigneeCompleted(task: Task): boolean {
  return isCurrentUserAssigneeCompletedByPolicy(task, buildPolicyContext())
}

export function isCurrentUserTaskAdmin(teamMembers: TeamMember[]): boolean {
  void teamMembers
  return false
}

export function canConfigureTaskCompletionMode(task: Task): boolean {
  const assigneeCount = task.members.filter((member) => member.role === 'assignee').length
  return assigneeCount > 1
}

export function getTaskCompletionActions(
  task: Task,
  _teamMembers: TeamMember[],
  tasklist?: Tasklist | null,
): TaskCompletionAction[] {
  return getTaskCompletionActionsByPolicy(task, buildPolicyContext(tasklist))
}

export function getTaskCompletionTriggerState(
  task: Task,
  tasklist?: Tasklist | null,
): TaskCompletionTriggerState {
  return getTaskCompletionTriggerStateByPolicy(task, buildPolicyContext(tasklist))
}

export function getTaskCompletionConfirm(
  task: Task,
  action: TaskCompletionAction,
  tasklist?: Tasklist | null,
): TaskCompletionConfirm | null {
  return getTaskCompletionConfirmByPolicy(task, action, buildPolicyContext(tasklist))
}
