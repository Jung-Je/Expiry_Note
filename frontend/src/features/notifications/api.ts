import { api } from '../../lib/api'

export type NotificationType = 'expiry' | 'payment'

export interface Notification {
  id: number
  item: number
  type: NotificationType
  title: string
  message: string
  for_date: string
  is_read: boolean
  created_at: string
}

export async function listNotifications(params?: { unread?: boolean }): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/notifications/', {
    params: params?.unread ? { unread: '1' } : undefined,
  })
  return data
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await api.post<Notification>(`/notifications/${id}/read/`)
  return data
}

export async function markAllNotificationsRead(): Promise<{ updated_count: number }> {
  const { data } = await api.post<{ updated_count: number }>('/notifications/read-all/')
  return data
}

export interface NotificationPreference {
  push_enabled: boolean
  updated_at: string
}

export async function getNotificationPreference(): Promise<NotificationPreference> {
  const { data } = await api.get<NotificationPreference>('/notifications/settings/')
  return data
}

export async function updateNotificationPreference(payload: {
  push_enabled: boolean
}): Promise<NotificationPreference> {
  const { data } = await api.patch<NotificationPreference>('/notifications/settings/', payload)
  return data
}
