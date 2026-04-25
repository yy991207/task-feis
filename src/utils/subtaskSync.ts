import type { Task } from '../types/task.ts'
import { inheritParentStartForTasks } from './taskDate.ts'

function isSubtaskOfParent(task: Task | null | undefined, parentTask: Task): task is Task {
  return Boolean(task?.parent_task_guid && task.parent_task_guid === parentTask.guid)
}

export function syncExternalSubtaskDrafts(
  drafts: Task[],
  parentTask: Task,
  externalTask: Task | null | undefined,
): Task[] {
  if (!isSubtaskOfParent(externalTask, parentTask)) {
    return drafts
  }

  const nextSubtask = inheritParentStartForTasks([externalTask], parentTask)[0]
  if (!nextSubtask) {
    return drafts
  }

  let matched = false
  const nextDrafts = drafts.map((draft) => {
    if (draft.guid !== nextSubtask.guid) {
      return draft
    }
    matched = true
    return nextSubtask
  })

  // 外部入口新建子任务时，如果当前详情已打开，也要把新增子任务补进草稿列表。
  return matched ? nextDrafts : [...nextDrafts, nextSubtask]
}

export function syncExternalSubtaskCache(
  cache: Record<string, Task[]>,
  externalTask: Task | null | undefined,
): Record<string, Task[]> {
  const parentGuid = externalTask?.parent_task_guid
  if (!parentGuid) {
    return cache
  }

  const currentChildren = cache[parentGuid]
  if (!currentChildren) {
    return cache
  }

  let matched = false
  const nextChildren = currentChildren.map((child) => {
    if (child.guid !== externalTask.guid) {
      return child
    }
    matched = true
    return externalTask
  })

  return {
    ...cache,
    [parentGuid]: matched ? nextChildren : [...nextChildren, externalTask],
  }
}
