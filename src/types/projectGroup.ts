export interface ProjectGroup {
  group_id: string
  name: string
  sort_order: number
  is_default: boolean
  created_at?: string
  updated_at?: string
  team_id?: string
  owner_user_id?: string
  project_count?: number
}
