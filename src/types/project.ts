export interface Project {
  project_id: string
  team_id: string
  name: string
  description: string | null
  status: 'active' | 'archived'
  group_id: string
  user_group_id?: string | null
  user_group_name?: string | null
  creator_id: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  task_count: number
  done_count: number
}
