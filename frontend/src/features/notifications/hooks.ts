import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from './api'

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
