import type { Task } from '../types/task.ts'

export function inheritParentStartForTasks(tasks: Task[], parent: Task): Task[] {
  return tasks.map((task) => {
    if (!task.parent_task_guid) {
      return task
    }

    // 子任务没有单独配置开始时间时，前端展示回退到父任务开始时间；一旦子任务自己设置了开始时间，就以子任务自身为准。
    return {
      ...task,
      start: task.start
        ? { ...task.start }
        : parent.start
          ? { ...parent.start }
          : undefined,
    }
  })
}
