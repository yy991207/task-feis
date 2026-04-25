export interface TaskCompletionAction {
  key: string
  label: string
  status: 'done' | 'todo'
  scope?: 'self' | 'all'
}

export interface TaskCompletionConfirm {
  title: string
  content: string
  okText: string
}

export interface TaskCompletionTriggerState {
  checked: boolean
  tooltip: string
}

export interface TaskCompletionPolicyContext {
  currentUserId?: string
  tasklistCreatorId?: string | null
}

interface TaskCompletionPolicyMember {
  id: string
  role: 'assignee' | 'follower'
}

interface TaskCompletionPolicyAssigneeCompletion {
  user_id: string
  is_completed: boolean
}

interface TaskCompletionPolicyTask {
  status: string
  completion_mode?: 'any' | 'all'
  members: TaskCompletionPolicyMember[]
  assignee_completions?: TaskCompletionPolicyAssigneeCompletion[]
}

function resolveCurrentUserId(context?: TaskCompletionPolicyContext): string {
  return context?.currentUserId ?? ''
}

function getCompletionMode(task: Pick<TaskCompletionPolicyTask, 'completion_mode'>): 'any' | 'all' {
  return task.completion_mode === 'all' ? 'all' : 'any'
}

function getAssigneeIds(task: Pick<TaskCompletionPolicyTask, 'members'>): string[] {
  return task.members
    .filter((member) => member.role === 'assignee')
    .map((member) => member.id)
}

function getAssigneeCompletionMap(task: Pick<TaskCompletionPolicyTask, 'assignee_completions'>): Map<string, boolean> {
  return new Map(
    (task.assignee_completions ?? []).map((item) => [item.user_id, item.is_completed]),
  )
}

function isTaskDone(task: Pick<TaskCompletionPolicyTask, 'status'>): boolean {
  return task.status === 'done'
}

export function isTasklistCreatorAdmin(context?: TaskCompletionPolicyContext): boolean {
  const currentUserId = resolveCurrentUserId(context)
  const tasklistCreatorId = context?.tasklistCreatorId?.trim()
  return Boolean(tasklistCreatorId) && tasklistCreatorId === currentUserId
}

export function isCurrentUserTaskAssignee(
  task: Pick<TaskCompletionPolicyTask, 'members'>,
  context?: TaskCompletionPolicyContext,
): boolean {
  const currentUserId = resolveCurrentUserId(context)
  return getAssigneeIds(task).includes(currentUserId)
}

export function isCurrentUserAssigneeCompleted(
  task: Pick<TaskCompletionPolicyTask, 'members' | 'assignee_completions' | 'status'>,
  context?: TaskCompletionPolicyContext,
): boolean {
  const currentUserId = resolveCurrentUserId(context)
  const currentCompletion = task.assignee_completions?.find((item) => item.user_id === currentUserId)
  if (currentCompletion) {
    return currentCompletion.is_completed
  }
  return isCurrentUserTaskAssignee(task, context) ? isTaskDone(task) : false
}

function hasIncompleteAssignee(
  task: Pick<TaskCompletionPolicyTask, 'members' | 'assignee_completions' | 'status'>,
): boolean {
  const assigneeIds = getAssigneeIds(task)
  if (assigneeIds.length === 0) {
    return false
  }

  const completionMap = getAssigneeCompletionMap(task)
  return assigneeIds.some((assigneeId) => completionMap.get(assigneeId) !== true)
}

function areAllAssigneesCompleted(
  task: Pick<TaskCompletionPolicyTask, 'members' | 'assignee_completions' | 'status'>,
): boolean {
  return !hasIncompleteAssignee(task)
}

function getOtherAssigneeIds(
  task: Pick<TaskCompletionPolicyTask, 'members'>,
  context?: TaskCompletionPolicyContext,
): string[] {
  const currentUserId = resolveCurrentUserId(context)
  return getAssigneeIds(task).filter((assigneeId) => assigneeId !== currentUserId)
}

function hasOtherIncompleteAssignee(
  task: Pick<TaskCompletionPolicyTask, 'members' | 'assignee_completions'>,
  context?: TaskCompletionPolicyContext,
): boolean {
  const otherAssigneeIds = getOtherAssigneeIds(task, context)
  if (otherAssigneeIds.length === 0) {
    return false
  }

  const completionMap = getAssigneeCompletionMap(task)
  if (completionMap.size === 0) {
    return false
  }

  return otherAssigneeIds.some((assigneeId) => completionMap.get(assigneeId) !== true)
}

function hasOtherCompletedAssignee(
  task: Pick<TaskCompletionPolicyTask, 'members' | 'assignee_completions'>,
  context?: TaskCompletionPolicyContext,
): boolean {
  const otherAssigneeIds = getOtherAssigneeIds(task, context)
  if (otherAssigneeIds.length === 0) {
    return false
  }

  const completionMap = getAssigneeCompletionMap(task)
  if (completionMap.size === 0) {
    return false
  }

  return otherAssigneeIds.some((assigneeId) => completionMap.get(assigneeId) === true)
}

export function getTaskCompletionActions(
  task: Pick<TaskCompletionPolicyTask, 'status' | 'completion_mode' | 'members' | 'assignee_completions'>,
  context?: TaskCompletionPolicyContext,
): TaskCompletionAction[] {
  const isAdmin = isTasklistCreatorAdmin(context)
  const isAssignee = isCurrentUserTaskAssignee(task, context)
  const isSelfCompleted = isCurrentUserAssigneeCompleted(task, context)
  const assigneeCount = getAssigneeIds(task).length
  const completionMode = getCompletionMode(task)
  const taskDone = isTaskDone(task)

  if (assigneeCount <= 0) {
    if (taskDone) {
      return [{ key: 'todo', label: '重启任务', status: 'todo' }]
    }
    return [{ key: 'done', label: '标记完成', status: 'done' }]
  }

  if (!isAdmin) {
    if (isSelfCompleted) {
      return [{ key: 'todo:self', label: '重启我的任务', status: 'todo' }]
    }
    return [{ key: 'done:self', label: '标记完成', status: 'done' }]
  }

  if (completionMode === 'any') {
    if (taskDone) {
      return [{ key: 'todo:all', label: '重启任务', status: 'todo', scope: 'all' }]
    }
    return [{ key: 'done:all', label: '标记完成', status: 'done', scope: 'all' }]
  }

  if (!isAssignee) {
    if (taskDone) {
      return [{ key: 'todo:all', label: '重启任务', status: 'todo', scope: 'all' }]
    }
    return [{ key: 'done:all', label: '标记完成', status: 'done', scope: 'all' }]
  }

  if (taskDone && areAllAssigneesCompleted(task)) {
    return [
      { key: 'todo:self', label: '重启我的任务', status: 'todo', scope: 'self' },
      { key: 'todo:all', label: '重启全部任务', status: 'todo', scope: 'all' },
    ]
  }

  if (isSelfCompleted) {
    return [
      { key: 'todo:self', label: '重启我的任务', status: 'todo', scope: 'self' },
      { key: 'done:all', label: '为所有负责人完成', status: 'done', scope: 'all' },
    ]
  }

  return [
    { key: 'done:self', label: '仅我完成', status: 'done', scope: 'self' },
    { key: 'done:all', label: '为所有负责人完成', status: 'done', scope: 'all' },
  ]
}

export function getTaskCompletionTriggerState(
  task: Pick<TaskCompletionPolicyTask, 'status' | 'completion_mode' | 'members' | 'assignee_completions'>,
  context?: TaskCompletionPolicyContext,
): TaskCompletionTriggerState {
  const isAdmin = isTasklistCreatorAdmin(context)
  const isAssignee = isCurrentUserTaskAssignee(task, context)
  const completionMode = getCompletionMode(task)
  const selfCompleted = isCurrentUserAssigneeCompleted(task, context)
  let checked = isTaskDone(task)

  // 勾选展示按“当前用户视角”走：
  // 非负责人看整体完成态；
  // 非管理员负责人始终看自己的完成态；
  // 管理员负责人在“全部负责人均需完成”模式下，要兼容“仅我完成但整体未完成”的展示。
  if (isAssignee) {
    if (!isAdmin) {
      checked = selfCompleted
    } else if (completionMode === 'all') {
      checked = selfCompleted || isTaskDone(task)
    } else {
      checked = isTaskDone(task)
    }
  }

  return {
    checked,
    tooltip: checked ? '点击重启任务' : (isAdmin ? '点击完成任务' : '标记已完成'),
  }
}

export function getTaskCompletionConfirm(
  task: Pick<TaskCompletionPolicyTask, 'status' | 'completion_mode' | 'members' | 'assignee_completions'>,
  action: TaskCompletionAction,
  context?: TaskCompletionPolicyContext,
): TaskCompletionConfirm | null {
  const isAdmin = isTasklistCreatorAdmin(context)
  const isAssignee = isCurrentUserTaskAssignee(task, context)
  const completionMode = getCompletionMode(task)

  if (!isAdmin) {
    return null
  }

  if (completionMode === 'any' || !isAssignee) {
    return null
  }

  if (action.scope === 'all' && action.status === 'done' && hasOtherIncompleteAssignee(task, context)) {
    return {
      title: '完成任务',
      content: '还有负责人未完成任务，是否确认完成整个任务？',
      okText: '确认完成',
    }
  }

  if (action.scope === 'all' && action.status === 'todo' && hasOtherCompletedAssignee(task, context)) {
    return {
      title: '重启任务',
      content: '重启任务后，所有负责人的任务将回到未完成状态，是否确认重启？',
      okText: '确认重启',
    }
  }

  return null
}
