import { useMemo, useState } from 'react'
import Tabs from 'antd/es/tabs'
import List from 'antd/es/list'
import Empty from 'antd/es/empty'
import Button from 'antd/es/button'
import Tag from 'antd/es/tag'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import type { Project } from '@/types/project'
import { appConfig } from '@/config/appConfig'

const { Title, Text } = Typography

type OverviewTabKey = 'all' | 'created' | 'involved'

interface TasklistOverviewProps {
  projects: Project[]
  involvedProjectIds: string[]
  onOpenTasklist: (projectId: string) => void
}

function sortProjectsByUpdatedAtDesc(projects: Project[]): Project[] {
  return [...projects].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )
}

export default function TasklistOverview({
  projects,
  involvedProjectIds,
  onOpenTasklist,
}: TasklistOverviewProps) {
  const [activeTab, setActiveTab] = useState<OverviewTabKey>('all')
  const currentUserId = appConfig.user_id

  const involvedProjectIdSet = useMemo(() => new Set(involvedProjectIds), [involvedProjectIds])

  const allProjects = useMemo(() => sortProjectsByUpdatedAtDesc(projects), [projects])
  const createdProjects = useMemo(
    () =>
      sortProjectsByUpdatedAtDesc(
        projects.filter((project) => project.creator_id === currentUserId),
      ),
    [currentUserId, projects],
  )
  const involvedProjects = useMemo(
    () =>
      sortProjectsByUpdatedAtDesc(
        projects.filter((project) => involvedProjectIdSet.has(project.project_id)),
      ),
    [involvedProjectIdSet, projects],
  )

  const projectMap: Record<OverviewTabKey, Project[]> = {
    all: allProjects,
    created: createdProjects,
    involved: involvedProjects,
  }

  const renderProjectList = (items: Project[]) => {
    if (items.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无清单" />
    }

    return (
      <List
        dataSource={items}
        renderItem={(project) => (
          <List.Item
            actions={[
              <Button
                key="open"
                type="link"
                onClick={() => onOpenTasklist(project.project_id)}
              >
                打开
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space size={8}>
                  <span>{project.name}</span>
                  <Tag color="blue">{project.task_count} 个任务</Tag>
                </Space>
              }
              description={
                <Space size={12} wrap>
                  <Text type="secondary">
                    创建人: {project.creator_id === currentUserId ? '我' : project.creator_id}
                  </Text>
                  <Text type="secondary">
                    已完成: {project.done_count}
                  </Text>
                  <Text type="secondary">
                    更新时间: {new Date(project.updated_at).toLocaleString('zh-CN')}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    )
  }

  return (
    <div className="tasklist-overview-page">
      <div className="table-header-bar">
        <div className="table-title-row">
          <div className="table-title-meta">
            <Title level={4} className="table-title">
              任务清单
            </Title>
            <Text type="secondary">这里展示全部清单，不区分自定义分组和默认分组。</Text>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 24px', overflow: 'auto', height: '100%' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as OverviewTabKey)}
          items={[
            {
              key: 'all',
              label: '全部清单',
              children: renderProjectList(projectMap.all),
            },
            {
              key: 'created',
              label: '我创建的',
              children: renderProjectList(projectMap.created),
            },
            {
              key: 'involved',
              label: '我参与的',
              children: renderProjectList(projectMap.involved),
            },
          ]}
        />
      </div>
    </div>
  )
}
