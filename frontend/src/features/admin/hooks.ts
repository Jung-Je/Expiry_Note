import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from './api'

// 목록은 페이지를 넘기거나 필터를 바꿀 때 이전 결과를 그대로 보여주다가 바꾼다
// (keepPreviousData) — 매번 "불러오는 중"으로 깜빡이지 않게.

export function useAdminUsersQuery(params: adminApi.UserListParams) {
  return useQuery({
    queryKey: ['admin', 'users', 'list', params],
    queryFn: () => adminApi.listUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useAdminUserSummaryQuery(id: number) {
  return useQuery({
    queryKey: ['admin', 'users', 'summary', id],
    queryFn: () => adminApi.getUserSummary(id),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useSetUserActiveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminApi.setUserActive(id, isActive),
    onSuccess: () => {
      // 목록·회원 상세와 개요의 비활성 계정 수, 작업 기록이 같이 바뀐다.
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
      // 관리자가 본인 플랜을 바꾼 경우 사이드바·설정 화면의 내 구독 정보와,
      // 방금 생긴 요금제 변경 알림(사이드바 숫자)도 다시 받는다.
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}

export function useAdminInquiriesQuery(params: adminApi.InquiryListParams) {
  return useQuery({
    queryKey: ['admin', 'inquiries', 'list', params],
    queryFn: () => adminApi.listInquiries(params),
    placeholderData: keepPreviousData,
  })
}

// 사이드바 배지와 문의 관리 화면 머리말용. 건수만 필요해서 한 건짜리 페이지를
// 받아 count만 쓴다. 알림 숫자와 같이 1분마다 다시 받는다.
const UNANSWERED_REFETCH_INTERVAL_MS = 60_000

export function useUnansweredInquiryCountQuery(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'inquiries', 'unanswered-count'],
    queryFn: () => adminApi.listInquiries({ answered: false, pageSize: 1 }),
    select: (page) => page.count,
    refetchInterval: UNANSWERED_REFETCH_INTERVAL_MS,
    enabled,
  })
}

export function useReplyToInquiryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      adminApi.replyToInquiry(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
      // 회원 상세의 문의 이력.
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'summary'] })
    },
  })
}

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminApi.getOverview,
  })
}

export function useAdminPaymentsQuery(page: number) {
  return useQuery({
    queryKey: ['admin', 'payments', page],
    queryFn: () => adminApi.listPayments(page),
    placeholderData: keepPreviousData,
  })
}

export function useAdminLogsQuery(params: { action?: adminApi.AdminAction; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => adminApi.listLogs(params),
    placeholderData: keepPreviousData,
  })
}

export function useSendNoticeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminApi.sendNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
      // 관리자 본인도 공지를 받는다 — 사이드바 알림 숫자를 바로 올린다.
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}
