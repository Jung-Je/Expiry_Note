import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from './api'

export function useNotificationsQuery(params?: { unread?: boolean }) {
  return useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn: () => notificationsApi.listNotifications(params),
  })
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}

export function useNotificationPreferenceQuery() {
  return useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: () => notificationsApi.getNotificationPreference(),
  })
}

export function useUpdateNotificationPreferenceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { push_enabled: boolean }) =>
      notificationsApi.updateNotificationPreference(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'settings'] })
    },
  })
}
