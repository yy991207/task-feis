import type { Project } from '../../types/project'

export const EMPTY_GROUP_PLACEHOLDER_PREFIX = 'grp-empty:'

export const encodeTasklistKey = (guid: string) => `tl:${guid}`
export const encodeGroupKey = (id: string) => `grp:${id}`

export type SidebarDropPosition = -1 | 0 | 1

export interface TasklistDropInput {
  projects: Project[]
  projectId: string
  dropKey: string
  dropPosition: SidebarDropPosition
  defaultGroupId?: string | null
}

export interface TasklistDropResult {
  projects: Project[]
  targetGroupId: string
  changedGroup: boolean
  sortOrder: number
}

export function getProjectGroupId(project: Project): string | null {
  // 新接口返回 user_group_id；保留 group_id 作为旧数据兼容，避免切换期间侧栏丢分组。
  return project.user_group_id || project.group_id || null
}

export function getRelativeDropPosition(
  rawDropPosition: number,
  nodePosition?: string,
): SidebarDropPosition {
  if (rawDropPosition === 0) {
    return 0
  }

  const nodeIndex = Number(nodePosition?.split('-').at(-1) ?? 0)
  const relativePosition = rawDropPosition - nodeIndex
  if (relativePosition < 0) {
    return -1
  }
  if (relativePosition > 0) {
    return 1
  }
  return 0
}

function resolveTargetGroupId(
  projects: Project[],
  dropKey: string,
  defaultGroupId?: string | null,
): string | null {
  if (dropKey.startsWith('grp:')) {
    return dropKey.slice(4)
  }
  if (dropKey.startsWith(EMPTY_GROUP_PLACEHOLDER_PREFIX)) {
    return dropKey.slice(EMPTY_GROUP_PLACEHOLDER_PREFIX.length)
  }
  if (dropKey === 'root') {
    return defaultGroupId ?? null
  }
  if (dropKey.startsWith('tl:')) {
    const droppedProjectId = dropKey.slice(3)
    const ownerProject = projects.find((project) => project.project_id === droppedProjectId)
    return ownerProject ? getProjectGroupId(ownerProject) : defaultGroupId ?? null
  }
  return null
}

function computeInsertedSortOrder(
  projects: Project[],
  insertIndex: number,
): number {
  const prev = insertIndex > 0 ? projects[insertIndex - 1] : undefined
  const next = projects[insertIndex]
  const prevSortOrder = prev?.sort_order
  const nextSortOrder = next?.sort_order

  if (prevSortOrder === undefined && nextSortOrder === undefined) {
    return 1024
  }
  if (prevSortOrder === undefined) {
    return nextSortOrder! - 1024
  }
  if (nextSortOrder === undefined) {
    return prevSortOrder + 1024
  }
  return (prevSortOrder + nextSortOrder) / 2
}

export function applyTasklistDrop({
  projects,
  projectId,
  dropKey,
  dropPosition,
  defaultGroupId,
}: TasklistDropInput): TasklistDropResult | null {
  const currentProject = projects.find((project) => project.project_id === projectId)
  if (!currentProject) {
    return null
  }

  const targetGroupId = resolveTargetGroupId(projects, dropKey, defaultGroupId)
  if (!targetGroupId) {
    return null
  }

  const currentGroupId = getProjectGroupId(currentProject)
  const movedProject: Project = {
    ...currentProject,
    group_id: targetGroupId,
    user_group_id: targetGroupId,
  }

  const projectsWithoutMoved = projects.filter((project) => project.project_id !== projectId)
  const targetProjects = projectsWithoutMoved.filter(
    (project) => getProjectGroupId(project) === targetGroupId,
  )
  const otherProjects = projectsWithoutMoved.filter(
    (project) => getProjectGroupId(project) !== targetGroupId,
  )

  let insertIndex = targetProjects.length
  if (dropKey.startsWith('tl:')) {
    const droppedProjectId = dropKey.slice(3)
    const dropIndex = targetProjects.findIndex(
      (project) => project.project_id === droppedProjectId,
    )
    if (dropIndex === -1) {
      return null
    }
    insertIndex = dropPosition < 0 ? dropIndex : dropIndex + 1
  }

  const reorderedTargetProjects = [...targetProjects]
  const sortOrder = computeInsertedSortOrder(reorderedTargetProjects, insertIndex)
  movedProject.sort_order = sortOrder
  reorderedTargetProjects.splice(insertIndex, 0, movedProject)

  return {
    projects: [...otherProjects, ...reorderedTargetProjects],
    targetGroupId,
    changedGroup: currentGroupId !== targetGroupId,
    sortOrder,
  }
}
