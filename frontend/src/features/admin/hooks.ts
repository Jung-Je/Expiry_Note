import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from './api'

export function useAdminUsersQuery(search: string) {
  return useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.listUsers(search || undefined),
  })
}

export function useSetUserActiveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminApi.setUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useAdminInquiriesQuery() {
  return useQuery({
    queryKey: ['admin', 'inquiries'],
    queryFn: adminApi.listInquiries,
  })
}

export function useReplyToInquiryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      adminApi.replyToInquiry(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
    },
  })
}

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminApi.getOverview,
  })
}

export function useAdminPaymentsQuery() {
  return useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: adminApi.listPayments,
  })
}
