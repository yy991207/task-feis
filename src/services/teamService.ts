import { request } from './request'
import { appConfig } from '@/config/appConfig'

export interface TeamMember {
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export function listMembers(): Promise<TeamMember[]> {
  return request<TeamMember[]>(
    `api/v1/task-center/teams/${appConfig.team_id}/members?user_id=${encodeURIComponent(appConfig.user_id)}`,
  )
}

export function addMembers(userIds: string[]): Promise<void> {
  return request<void>(
    `api/v1/task-center/teams/${appConfig.team_id}/members`,
    {
      method: 'POST',
      body: JSON.stringify({ user_id: appConfig.user_id, user_ids: userIds }),
    },
  )
}

export function removeMember(targetUserId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/teams/${appConfig.team_id}/members/${targetUserId}?user_id=${encodeURIComponent(appConfig.user_id)}`,
    { method: 'DELETE' },
  )
}

export function updateMemberRole(
  targetUserId: string,
  role: 'admin' | 'member',
): Promise<void> {
  return request<void>(
    `api/v1/task-center/teams/${appConfig.team_id}/members/${targetUserId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ user_id: appConfig.user_id, role }),
    },
  )
}

export function transferOwner(newOwnerId: string): Promise<void> {
  return request<void>(
    `api/v1/task-center/teams/${appConfig.team_id}/transfer`,
    {
      method: 'POST',
      body: JSON.stringify({
        user_id: appConfig.user_id,
        new_owner_id: newOwnerId,
      }),
    },
  )
}
