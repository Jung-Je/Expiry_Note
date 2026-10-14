import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from './api'

export function useNotificationsQuery(params?: { unread?: boolean }) {
  return useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn: () => notificationsApi.listNotifications(params),
  })
}

// 사이드바 배지용. 탭이 떠 있는 동안 새 알림이 생겨도 보이도록 1분마다 다시
// 받는다(창으로 돌아올 때도 TanStack Query가 다시 받는다). 알림 화면의 "읽지 않음"
// 필터와 같은 캐시를 쓰므로, 읽음 처리로 목록이 무효화되면 배지도 같이 줄어든다.
const UNREAD_REFETCH_INTERVAL_MS = 60_000

export function useUnreadNotificationCountQuery() {
  return useQuery({
    queryKey: ['notifications', 'list', { unread: true }],
    queryFn: () => notificationsApi.listNotifications({ unread: true }),
    select: (notifications) => notifications.length,
    refetchInterval: UNREAD_REFETCH_INTERVAL_MS,
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
