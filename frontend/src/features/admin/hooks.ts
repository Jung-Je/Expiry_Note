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

export function useGrantUserPlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, plan, periodEnd }: { id: number; plan: adminApi.AdminPlan; periodEnd: string | null }) =>
      adminApi.grantUserPlan(id, plan, periodEnd),
    onSuccess: () => {
      // 개요 화면의 플랜 분포도 같이 바뀐다.
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
      // 관리자가 본인 플랜을 바꾼 경우 사이드바·설정 화면의 내 구독 정보도 다시 받는다.
      queryClient.invalidateQueries({ queryKey: ['billing'] })
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
