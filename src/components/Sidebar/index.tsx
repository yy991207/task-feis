import { useState, useMemo, useEffect, useRef } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import message from 'antd/es/message'
import Dropdown from 'antd/es/dropdown'
import Tree from 'antd/es/tree'
import Menu from 'antd/es/menu'
import Button from 'antd/es/button'
import Typography from 'antd/es/typography'
import Divider from 'antd/es/divider'
import Tooltip from 'antd/es/tooltip'
import Flex from 'antd/es/flex'
import Space from 'antd/es/space'
import type { DataNode, TreeProps } from 'antd/es/tree'
import type { MenuProps } from 'antd/es/menu'
import {
  UserOutlined,
  EyeOutlined,
  HistoryOutlined,
  StarOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  OrderedListOutlined,
  AppstoreOutlined,
  PlusOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  UnorderedListOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
  DragOutlined,
} from '@ant-design/icons'
import type { Tasklist } from '@/types/task'
import NotificationBell from '@/components/NotificationBell'
import CustomFieldsModal from '@/components/CustomFieldsModal'
import UserSwitcher from '@/components/UserSwitcher'
import type { ProjectGroup } from '@/types/projectGroup'
import type { Project } from '@/types/project'
import {
  listProjectGroups,
  createProjectGroup,
  updateProjectGroup as apiUpdateProjectGroup,
  deleteProjectGroup as apiDeleteProjectGroup,
  updateGroupSortOrder,
} from '@/services/projectGroupService'
import {
  listProjects,
  createProject,
  updateProject as apiUpdateProject,
  deleteProject as apiDeleteProject,
  moveProjectToGroup,
} from '@/services/projectService'
import EditableInput from '@/components/EditableInput'
import NameOverflowPreview from '@/components/NameOverflowPreview'
import {
  applyTasklistDrop,
  encodeGroupKey,
  encodeTasklistKey,
  getRelativeDropPosition,
} from './tasklistDrag'
import './index.less'

const { Title, Text } = Typography

export type NavKey =
  | 'my-assigned'
  | 'my-followed'
  | 'activity'
  | 'from-project'
  | 'tasklists-root'
  | 'all-tasks'
  | 'my-created'
  | 'my-assigned-quick'
  | 'done'
  | 'settings'
  | { type: 'tasklist'; guid: string }

interface SidebarProps {
  activeKey: NavKey
  tasklists: Tasklist[]
  onNavigate: (key: NavKey) => void
  onTasklistsChange?: () => void
  onTasklistCreated?: (tasklist: Tasklist) => void
  onTasklistUpdated?: (tasklist: Tasklist) => void
  onToggleCollapse?: () => void
}

type CreatingTarget = 'root' | string

const EMPTY_GROUP_PLACEHOLDER_PREFIX = 'grp-empty:'

function getProjectGroupId(project: Project, groups: ProjectGroup[]): string | null {
  if (project.user_group_id) {
    return project.user_group_id
  }
  if (project.group_id && groups.some((group) => group.group_id === project.group_id)) {
    return project.group_id
  }
  return null
}

interface EmptyGroupPlaceholderNodeOptions {
  groupId: string
  active: boolean
  onDragOver: (event: ReactDragEvent<HTMLDivElement>, groupId: string) => void
  onDragLeave: (groupId: string) => void
  onDrop: (event: ReactDragEvent<HTMLDivElement>, groupId: string) => void
}

const buildEmptyGroupPlaceholderNode = ({
  groupId,
  active,
  onDragOver,
  onDragLeave,
  onDrop,
}: EmptyGroupPlaceholderNodeOptions): DataNode => ({
  key: `${EMPTY_GROUP_PLACEHOLDER_PREFIX}${groupId}`,
  title: (
    <div
      className="empty-group-drop-hint"
      onDragOver={(event) => onDragOver(event, groupId)}
      onDragLeave={() => onDragLeave(groupId)}
      onDrop={(event) => onDrop(event, groupId)}
    >
      可拖拽清单加入该分组
    </div>
  ),
  selectable: false,
  isLeaf: true,
  className: active ? 'empty-group-placeholder drop-target' : 'empty-group-placeholder',
})

function buildSidebarDragNodeClassName(
  nodeKey: string,
  draggingTasklistKey: string | null,
  baseClassName?: string,
): string {
  const classNames = [baseClassName]
  if (draggingTasklistKey === nodeKey) {
    classNames.push('dragging')
  }
  return classNames.filter(Boolean).join(' ')
}

// 刷新后默认展示完整清单树：根清单区和所有清单分组都展开。
const buildDefaultExpandedKeys = (groups: ProjectGroup[]): React.Key[] => [
  'root',
  ...groups
    .filter((group) => !group.is_default)
    .map((group) => encodeGroupKey(group.group_id)),
]

function generateDefaultTasklistName(projects: Project[]): string {
  const maxIndex = projects.reduce((max, proj) => {
    const match = proj.name.match(/^任务清单\s*(\d+)$/)
    if (!match) {
      return max
    }
    return Math.max(max, Number(match[1]))
  }, 0)

  return `任务清单 ${maxIndex + 1}`
}

export default function Sidebar({
  activeKey,
  tasklists,
  onNavigate,
  onTasklistsChange,
  onTasklistCreated,
  onTasklistUpdated,
  onToggleCollapse,
}: SidebarProps) {
  const [creatingTarget, setCreatingTarget] = useState<CreatingTarget | null>(null)
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [draftGroupUid, setDraftGroupUid] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingTasklistGuid, setEditingTasklistGuid] = useState<string | null>(null)
  const [openedGroupMenuId, setOpenedGroupMenuId] = useState<string | null>(null)
  const [openedProjectMenuId, setOpenedProjectMenuId] = useState<string | null>(null)
  const [customFieldsProjectId, setCustomFieldsProjectId] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['root'])
  const [draggingTasklistKey, setDraggingTasklistKey] = useState<string | null>(null)
  const [emptyGroupDropTargetId, setEmptyGroupDropTargetId] = useState<string | null>(null)
  const dragPreviewRef = useRef<HTMLDivElement | null>(null)

  const refreshProjectsFromApi = async () => {
    const latestProjects = await listProjects()
    setProjects(latestProjects)
    return latestProjects
  }

  useEffect(() => {
    listProjectGroups()
      .then((list) => {
        setGroups(list)
        setExpandedKeys((prev) => {
          const next = new Set(prev)
          buildDefaultExpandedKeys(list).forEach((key) => next.add(key))
          return Array.from(next)
        })
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '加载分组失败'
        message.error(msg)
      })

    refreshProjectsFromApi()
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '加载清单失败'
        message.error(msg)
      })
  }, [])

  // 顶部主菜单（Menu）
  const topMenuItems: MenuProps['items'] = [
    {
      key: 'my-assigned',
      icon: <UserOutlined />,
      label: '我负责的',
    },
    { key: 'my-followed', icon: <EyeOutlined />, label: '我关注的' },
    { key: 'activity', icon: <HistoryOutlined />, label: '动态' },
  ]

  // 快速访问 Menu
  const quickAccessItems: MenuProps['items'] = [
    {
      key: 'quick-access',
      type: 'group',
      label: '快速访问',
      children: [
        { key: 'all-tasks', icon: <FileTextOutlined />, label: '全部任务' },
        { key: 'my-created', icon: <OrderedListOutlined />, label: '我创建的' },
        { key: 'my-assigned-quick', icon: <AppstoreOutlined />, label: '我分配的' },
        { key: 'done', icon: <StarOutlined />, label: '已完成' },
      ],
    },
  ]

  const selectedMenuKey = typeof activeKey === 'string' ? activeKey : ''

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    onNavigate(key as NavKey)
  }

  const startCreateTasklist = async (target: CreatingTarget) => {
    if (creatingTarget) {
      return
    }
    setCreatingTarget(target)
    const expandKey = target === 'root' ? 'root' : encodeGroupKey(target)
    setExpandedKeys((prev) =>
      prev.includes(expandKey) ? prev : [...prev, expandKey],
    )

    try {
      const groupId = target === 'root' ? defaultGroup?.group_id : target
      const defaultName = generateDefaultTasklistName(projects)
      const project = await createProject(defaultName, groupId)
      setProjects((prev) => [...prev, project])

      const tasklist: Tasklist = {
        guid: project.project_id,
        name: project.name,
        owner: { id: project.creator_id, type: 'user' },
        creator: { id: project.creator_id, type: 'user' },
        members: [],
        sections: [],
        custom_fields: [],
        archive_msec: '0',
        created_at: new Date(project.created_at).getTime().toString(),
        updated_at: new Date(project.updated_at).getTime().toString(),
        url: '',
      }

      setEditingTasklistGuid(project.project_id)
      onTasklistCreated?.(tasklist)
      if (!onTasklistCreated) {
        onTasklistsChange?.()
        onNavigate({ type: 'tasklist', guid: project.project_id })
      }
    } catch {
      message.error('创建清单失败')
    } finally {
      setCreatingTarget(null)
    }
  }

  const handleStartCreateGroup = async () => {
    if (draftGroupUid) return
    try {
      const created = await createProjectGroup('新分组')
      setGroups((prev) => [...prev, created])
      setExpandedKeys((prev) => [...prev, encodeGroupKey(created.group_id)])
      // 立即进入重命名模式，便于修改名称
      setEditingGroupId(created.group_id)
      message.success('已创建清单分组')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建清单分组失败'
      message.error(msg)
    }
  }

  const handleSaveGroupName = async (groupId: string, rawName: string) => {
    const name = rawName.trim()
    const isDraft = groupId === draftGroupUid

    if (!name || name.length > 50) {
      if (isDraft) {
        setDraftGroupUid(null)
      }
      setEditingGroupId(null)
      return
    }

    if (isDraft) {
      try {
        const created = await createProjectGroup(name)
        setGroups((prev) => [...prev, created])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '操作失败'
        message.error(msg)
      } finally {
        setDraftGroupUid(null)
        setEditingGroupId(null)
      }
    } else {
      try {
        const updated = await apiUpdateProjectGroup(groupId, name)
        setGroups((prev) =>
          prev.map((g) => (g.group_id === groupId ? updated : g)),
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '操作失败'
        message.error(msg)
      } finally {
        setEditingGroupId(null)
      }
    }
  }

  const handleStartRenameGroup = (groupId: string) => {
    setOpenedGroupMenuId(null)
    setEditingGroupId(groupId)
  }

  const handleDeleteGroup = async (groupId: string) => {
    setOpenedGroupMenuId(null)
    setEditingGroupId((prev) => (prev === groupId ? null : prev))
    try {
      await apiDeleteProjectGroup(groupId)
      setGroups((prev) => prev.filter((group) => group.group_id !== groupId))
      message.success('已删除清单分组')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败'
      message.error(msg)
    }
  }

  const handleRenameTasklist = async (tasklistGuid: string, rawName: string) => {
    const currentProject = projects.find((p) => p.project_id === tasklistGuid)
    const currentTasklist = tasklists.find((tasklist) => tasklist.guid === tasklistGuid)
    setEditingTasklistGuid(null)

    const currentName = currentProject?.name || currentTasklist?.name
    if (!currentName) {
      return
    }

    const nextName = rawName.trim() || currentName
    if (nextName === currentName) {
      return
    }

    try {
      const updated = await apiUpdateProject(tasklistGuid, { name: nextName })
      setProjects((prev) =>
        prev.map((p) => (p.project_id === tasklistGuid ? updated : p)),
      )
      const nextTasklist: Tasklist = {
        ...(currentTasklist || {
          guid: tasklistGuid,
          name: nextName,
          owner: { id: updated.creator_id, type: 'user' as const },
          creator: { id: updated.creator_id, type: 'user' as const },
          members: [],
          sections: [],
          custom_fields: [],
          archive_msec: '0',
          created_at: new Date(updated.created_at).getTime().toString(),
          updated_at: new Date(updated.updated_at).getTime().toString(),
          url: '',
        }),
        name: nextName,
      }
      onTasklistUpdated?.(nextTasklist)
      if (!onTasklistUpdated) {
        onTasklistsChange?.()
      }
    } catch {
      message.error('重命名清单失败')
    }
  }

  const handleStartRenameTasklist = (projectId: string) => {
    setOpenedProjectMenuId(null)
    setEditingTasklistGuid(projectId)
  }

  const handleDeleteTasklist = async (projectId: string) => {
    setOpenedProjectMenuId(null)
    try {
      await apiDeleteProject(projectId)
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId))
      message.success('已删除清单')
      if (
        typeof activeKey === 'object' &&
        activeKey.type === 'tasklist' &&
        activeKey.guid === projectId
      ) {
        onNavigate('all-tasks')
      }
      onTasklistsChange?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '删除清单失败'
      message.error(msg)
    }
  }

  const defaultGroup = groups.find((g) => g.is_default)

  const projectsByGroup = useMemo(() => {
    const map: Record<string, Project[]> = {}
    for (const p of projects) {
      const gid = getProjectGroupId(p, groups)
      if (!gid) continue
      if (!map[gid]) map[gid] = []
      map[gid].push(p)
    }
    return map
  }, [groups, projects])

  const ungroupedProjects = defaultGroup
    ? projects
      .filter((p) => {
        const groupId = getProjectGroupId(p, groups)
        return !groupId || groupId === defaultGroup.group_id
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : projects
      .filter((p) => !getProjectGroupId(p, groups))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const buildGroupActionMenu = (group: ProjectGroup) => ({
    items: [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        disabled: group.is_default,
        onClick: () => handleStartRenameGroup(group.group_id),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        disabled: group.is_default,
        onClick: () => {
          void handleDeleteGroup(group.group_id)
        },
      },
    ],
  })

  const buildTasklistActionMenu = (proj: Project): MenuProps => ({
    items: [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: () => handleStartRenameTasklist(proj.project_id),
      },
      {
        key: 'delete',
        icon: <StopOutlined />,
        label: '删除',
        danger: true,
        onClick: () => {
          void handleDeleteTasklist(proj.project_id)
        },
      },
    ],
  })

  const renderGroupTitle = (group: ProjectGroup) => {
    if (editingGroupId === group.group_id) {
      return (
        <EditableInput
          placeholder="输入清单分组名称"
          defaultValue={group.name}
          onSubmit={(v) => {
            void handleSaveGroupName(group.group_id, v)
          }}
        />
      )
    }
    return (
      <Flex align="center" justify="space-between" className="group-title-row">
        <div className="group-title-main">
          <div className="group-name-wrap">
            <NameOverflowPreview
              name={group.name}
              previewClassName="sidebar-group-name-preview"
            >
              <Text className="group-name">{group.name}</Text>
            </NameOverflowPreview>
          </div>
        </div>
        <Space size={2} className="group-actions">
          <Dropdown
            menu={buildGroupActionMenu(group)}
            trigger={['click']}
            onOpenChange={(open) => {
              setOpenedGroupMenuId(open ? group.group_id : null)
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<EllipsisOutlined />}
              className={`group-action-btn ${
                openedGroupMenuId === group.group_id ? 'always-visible' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            className="group-action-btn"
            loading={creatingTarget === group.group_id}
            onClick={(e) => {
              e.stopPropagation()
              void startCreateTasklist(group.group_id)
            }}
          />
        </Space>
      </Flex>
    )
  }

  const renderRootTitle = () => (
    <Flex align="center" justify="space-between" className="group-title-row">
      <div className="group-title-main">
        <div className="group-name-wrap">
          <NameOverflowPreview
            name="任务清单"
            previewClassName="sidebar-group-name-preview"
          >
            <Text className="group-name">任务清单</Text>
          </NameOverflowPreview>
        </div>
      </div>
      <Space size={2} className="group-actions">
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          className="group-action-btn"
          loading={creatingTarget === 'root'}
          onClick={(e) => {
            e.stopPropagation()
            void startCreateTasklist('root')
          }}
        />
      </Space>
    </Flex>
  )

  const renderProjectTitle = (proj: Project) => {
    const isActive =
      typeof activeKey === 'object' &&
      activeKey.type === 'tasklist' &&
      activeKey.guid === proj.project_id

    if (editingTasklistGuid === proj.project_id) {
      return (
        <div className="tasklist-title editing">
          <FileDoneOutlined className="tasklist-icon" />
          <div className="tasklist-name-editor">
            <EditableInput
              placeholder="输入清单名称"
              defaultValue={proj.name}
              onSubmit={(value) => {
                void handleRenameTasklist(proj.project_id, value)
              }}
            />
          </div>
        </div>
      )
    }

    return (
      <div
        className={`tasklist-title ${isActive ? 'active' : ''}`}
        data-sidebar-tasklist-key={encodeTasklistKey(proj.project_id)}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setEditingTasklistGuid(proj.project_id)
        }}
      >
        <FileDoneOutlined className="tasklist-icon" />
        <div className="tasklist-name-wrap">
          <NameOverflowPreview
            name={proj.name}
            previewClassName="sidebar-tasklist-name-preview"
          >
            <span className="tasklist-name">{proj.name}</span>
          </NameOverflowPreview>
        </div>
        <Dropdown
          menu={buildTasklistActionMenu(proj)}
          trigger={['click']}
          onOpenChange={(open) => {
            setOpenedProjectMenuId(open ? proj.project_id : null)
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<EllipsisOutlined />}
            className={`tasklist-action-btn ${
              openedProjectMenuId === proj.project_id ? 'always-visible' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
    )
  }

  const treeData = useMemo<DataNode[]>(() => {
    const rootChildren: DataNode[] = ungroupedProjects.length > 0
      ? ungroupedProjects.map((proj) => ({
          key: encodeTasklistKey(proj.project_id),
          title: renderProjectTitle(proj),
          isLeaf: true,
          className: buildSidebarDragNodeClassName(
            encodeTasklistKey(proj.project_id),
            draggingTasklistKey,
          ),
        }))
      : defaultGroup
        ? [
            buildEmptyGroupPlaceholderNode({
              groupId: defaultGroup.group_id,
              active: emptyGroupDropTargetId === defaultGroup.group_id,
              onDragOver: handleEmptyGroupDragOver,
              onDragLeave: handleEmptyGroupDragLeave,
              onDrop: handleEmptyGroupDrop,
            }),
          ]
        : []

    const rootNode: DataNode = {
      key: 'root',
      title: renderRootTitle(),
      children: rootChildren,
      selectable: true,
      className: buildSidebarDragNodeClassName(
        'root',
        draggingTasklistKey,
        'tree-section',
      ),
    }

    const nonDefaultGroups = [...groups]
      .filter((g) => !g.is_default)
      .sort((a, b) => a.sort_order - b.sort_order)
    const groupNodes: DataNode[] = nonDefaultGroups.map((group) => {
      const memberProjects = (projectsByGroup[group.group_id] || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const children: DataNode[] = memberProjects.length > 0
        ? memberProjects.map((proj) => ({
            key: encodeTasklistKey(proj.project_id),
            title: renderProjectTitle(proj),
            isLeaf: true,
            className: buildSidebarDragNodeClassName(
              encodeTasklistKey(proj.project_id),
              draggingTasklistKey,
            ),
          }))
        : [
            buildEmptyGroupPlaceholderNode({
              groupId: group.group_id,
              active: emptyGroupDropTargetId === group.group_id,
              onDragOver: handleEmptyGroupDragOver,
              onDragLeave: handleEmptyGroupDragLeave,
              onDrop: handleEmptyGroupDrop,
            }),
          ]

      return {
        key: encodeGroupKey(group.group_id),
        title: renderGroupTitle(group),
        children,
        selectable: false,
        className: buildSidebarDragNodeClassName(
          encodeGroupKey(group.group_id),
          draggingTasklistKey,
          'tree-section',
        ),
        icon: ({ expanded }: { expanded?: boolean }) =>
          expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
      }
    })

    const draftNode: DataNode[] = draftGroupUid
      ? [
          {
            key: encodeGroupKey(draftGroupUid),
            title: (
              <EditableInput
                placeholder="输入清单分组名称"
                defaultValue=""
                onSubmit={(v) => {
                  void handleSaveGroupName(draftGroupUid, v)
                }}
              />
            ),
            children: [],
            selectable: false,
            className: buildSidebarDragNodeClassName(
              encodeGroupKey(draftGroupUid),
              draggingTasklistKey,
              'tree-section',
            ),
          },
        ]
      : []

    return [rootNode, ...groupNodes, ...draftNode]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ungroupedProjects,
    groups,
    projects,
    projectsByGroup,
    draftGroupUid,
    editingGroupId,
    editingTasklistGuid,
    openedGroupMenuId,
    openedProjectMenuId,
    activeKey,
    draggingTasklistKey,
    emptyGroupDropTargetId,
  ])

  const selectableTreeKeySet = useMemo(() => {
    const keySet = new Set<string>()

    const walk = (nodes: DataNode[]) => {
      nodes.forEach((node) => {
        if (node.selectable !== false) {
          keySet.add(String(node.key))
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children)
        }
      })
    }

    walk(treeData)
    return keySet
  }, [treeData])

  const selectedKeys = useMemo<React.Key[]>(() => {
    if (activeKey === 'tasklists-root') {
      return ['root']
    }
    if (typeof activeKey === 'object' && activeKey.type === 'tasklist') {
      const nextKey = encodeTasklistKey(activeKey.guid)
      // Tree 内部会对受控 selectedKeys 做滚动定位，节点尚未渲染出来时要先拦住不存在的 key。
      return selectableTreeKeySet.has(nextKey) ? [nextKey] : []
    }
    return []
  }, [activeKey, selectableTreeKeySet])

  const handleSelect: TreeProps['onSelect'] = (_keys, info) => {
    const key = String(info.node.key)
    if (key === 'root') {
      onNavigate('tasklists-root')
      return
    }
    if (key.startsWith('tl:')) {
      onNavigate({ type: 'tasklist', guid: key.slice(3) })
    }
  }

  const handleExpand: TreeProps['onExpand'] = (keys) => {
    setExpandedKeys(keys)
  }

  function handleEmptyGroupDragOver(
    event: ReactDragEvent<HTMLDivElement>,
    groupId: string,
  ) {
    if (!draggingTasklistKey?.startsWith('tl:')) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setEmptyGroupDropTargetId((prev) => (prev === groupId ? prev : groupId))
  }

  function handleEmptyGroupDragLeave(groupId: string) {
    setEmptyGroupDropTargetId((prev) => (prev === groupId ? null : prev))
  }

  function handleEmptyGroupDrop(
    event: ReactDragEvent<HTMLDivElement>,
    groupId: string,
  ) {
    if (!draggingTasklistKey?.startsWith('tl:')) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    setEmptyGroupDropTargetId(null)
    void applySidebarTasklistDrop(
      draggingTasklistKey.slice(3),
      `${EMPTY_GROUP_PLACEHOLDER_PREFIX}${groupId}`,
      0,
    )
  }

  const applySidebarTasklistDrop = async (
    projectId: string,
    dropKey: string,
    dropPosition: -1 | 0 | 1,
  ) => {
    const dropResult = applyTasklistDrop({
      projects,
      projectId,
      dropKey,
      dropPosition,
      defaultGroupId: defaultGroup?.group_id,
    })
    if (!dropResult) return

    const prevProjects = projects
    setProjects(dropResult.projects)

    try {
      // 分组内拖拽排序成功后先保留本地顺序，避免立刻重拉清单时被旧排序快照覆盖回去。
      await moveProjectToGroup(projectId, dropResult.targetGroupId, dropResult.sortOrder)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败'
      message.error(msg)
      setProjects(prevProjects)
    }
  }

  const handleDrop: TreeProps['onDrop'] = (info) => {
    setEmptyGroupDropTargetId(null)
    const dragKey = String(info.dragNode.key)

    // Group node drag → reorder groups
    if (dragKey.startsWith('grp:')) {
      const dragGroupId = dragKey.slice(4)
      const ordered = [...groups].sort((a, b) => a.sort_order - b.sort_order)
      const fromIndex = ordered.findIndex((g) => g.group_id === dragGroupId)
      if (fromIndex === -1) return

      const dropKey = String(info.node.key)
      if (!dropKey.startsWith('grp:')) return
      const dropGroupId = dropKey.slice(4)
      const dropIndex = ordered.findIndex((g) => g.group_id === dropGroupId)
      if (dropIndex === -1) return

      let targetIndex: number
      if (info.dropPosition === -1) {
        targetIndex = dropIndex
      } else {
        targetIndex = dropIndex + 1
      }
      if (fromIndex < targetIndex) targetIndex -= 1
      if (targetIndex === fromIndex) return

      const without = ordered.filter((_, i) => i !== fromIndex)
      const prev = targetIndex > 0 ? without[targetIndex - 1] : undefined
      const next = without[targetIndex] as ProjectGroup | undefined
      let newSortOrder: number
      if (!prev && !next) newSortOrder = 1024
      else if (!prev) newSortOrder = next!.sort_order - 1024
      else if (!next) newSortOrder = prev.sort_order + 1024
      else newSortOrder = (prev.sort_order + next.sort_order) / 2

      const prevGroups = groups
      setGroups((prev) =>
        prev.map((g) =>
          g.group_id === dragGroupId ? { ...g, sort_order: newSortOrder } : g,
        ),
      )

      updateGroupSortOrder(dragGroupId, newSortOrder).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '操作失败'
        message.error(msg)
        setGroups(prevGroups)
      })
      return
    }

    if (!dragKey.startsWith('tl:')) return
    const projectId = dragKey.slice(3)
    const dropKey = String(info.node.key)

    const dropPosition = getRelativeDropPosition(
      info.dropPosition,
      'pos' in info.node ? String(info.node.pos) : undefined,
    )
    void applySidebarTasklistDrop(projectId, dropKey, dropPosition)
  }

  const clearDragPreview = () => {
    if (!dragPreviewRef.current) {
      return
    }
    dragPreviewRef.current.remove()
    dragPreviewRef.current = null
  }

  const buildTasklistDragPreview = (tasklistKey: string): HTMLDivElement | null => {
    if (typeof document === 'undefined') {
      return null
    }
    const sourceTitle = document.querySelector(
      `[data-sidebar-tasklist-key="${tasklistKey}"]`,
    ) as HTMLElement | null
    if (!sourceTitle) {
      return null
    }

    const preview = document.createElement('div')
    preview.className = 'sidebar-drag-preview'
    preview.style.width = `${sourceTitle.offsetWidth}px`

    const icon = sourceTitle.querySelector('.tasklist-icon')?.cloneNode(true)
    if (icon) {
      preview.appendChild(icon)
    }

    const label = document.createElement('span')
    label.className = 'sidebar-drag-preview__label'
    label.textContent = sourceTitle.querySelector('.tasklist-name')?.textContent?.trim() ?? ''
    preview.appendChild(label)

    document.body.appendChild(preview)
    dragPreviewRef.current = preview
    return preview
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Tooltip title="收起侧边栏" placement="right">
          <Button
            type="text"
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={onToggleCollapse}
            className="sidebar-toggle-btn"
          />
        </Tooltip>
        <Title level={5} className="sidebar-title">
          任务
        </Title>
        <div className="sidebar-header-actions">
          <UserSwitcher />
          <NotificationBell />
        </div>
      </div>

      <Menu
        mode="inline"
        items={topMenuItems}
        selectedKeys={[selectedMenuKey]}
        onClick={handleMenuClick}
        className="sidebar-menu"
      />

      <Divider className="sidebar-divider" />

      <Menu
        mode="inline"
        items={quickAccessItems}
        selectedKeys={[selectedMenuKey]}
        onClick={handleMenuClick}
        className="sidebar-menu"
      />

      <Divider className="sidebar-divider" />

      <div className="tasklist-tree-wrap">
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          onSelect={handleSelect}
          onExpand={handleExpand}
          blockNode
          showLine={false}
          draggable={{
            icon: <DragOutlined className="tasklist-drag-handle" />,
            nodeDraggable: (node) => {
              const k = String(node.key)
              return k.startsWith('tl:')
            },
          }}
          allowDrop={({ dragNode, dropNode, dropPosition }) => {
            const dragKey = String(dragNode.key)
            const dropKey = String(dropNode.key)
            // Group nodes can only reorder among other groups (gap drop, not into)
            if (dragKey.startsWith('grp:')) {
              return dropKey.startsWith('grp:') && dropPosition !== 0
            }
            // Tasklist nodes:
            //   - can drop into a group (dropPosition === 0 on a group) → move to that group
            //   - can drop as sibling of another tasklist (gap drop) → reorder/change group
            //   - can drop into root → move to default group
            if (dragKey.startsWith('tl:')) {
              if (dropKey.startsWith('grp:')) return true
              if (dropKey.startsWith(EMPTY_GROUP_PLACEHOLDER_PREFIX)) return true
              if (dropKey.startsWith('tl:')) return dropPosition !== 0
              if (dropKey === 'root') return true
              return false
            }
            return false
          }}
          dropIndicatorRender={(props) => {
            if (props.dropPosition === 0) {
              return null
            }
            return (
              <div
                className="sidebar-drop-indicator"
                style={{
                  left: 0,
                  right: 0,
                  top: props.dropPosition === -1 ? -3 : undefined,
                  bottom: props.dropPosition === 1 ? -3 : undefined,
                }}
              />
            )
          }}
          onDragStart={(info) => {
            const dragKey = String(info.node.key)
            setDraggingTasklistKey(dragKey)

            if (!dragKey.startsWith('tl:')) {
              return
            }

            const preview = buildTasklistDragPreview(dragKey)
            if (!preview) {
              return
            }

            const event = info.event
            const previewHeight = preview.offsetHeight
            event.dataTransfer?.setDragImage(preview, 18, previewHeight / 2)

            // 预览节点只给浏览器生成拖拽影像，不参与页面布局，下一帧就移除。
            requestAnimationFrame(() => {
              clearDragPreview()
            })
          }}
          onDragEnd={() => {
            setDraggingTasklistKey(null)
            setEmptyGroupDropTargetId(null)
            clearDragPreview()
          }}
          onDrop={handleDrop}
          switcherIcon={({ expanded }) =>
            expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
          }
        />
      </div>

      <div className="create-group-wrap">
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => void handleStartCreateGroup()}
          block
          className="create-group-btn"
        >
          新建清单分组
        </Button>
      </div>

      <CustomFieldsModal
        open={!!customFieldsProjectId}
        projectId={customFieldsProjectId ?? ''}
        onClose={() => setCustomFieldsProjectId(null)}
      />
    </div>
  )
}
