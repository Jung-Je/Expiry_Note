import { api } from '../../lib/api'

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
