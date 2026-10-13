import { api } from '../../lib/api'
import type { SignupSource } from '../auth/api'

export interface AdminUser {
  id: number
  email: string
  name: string
  is_active: boolean
  is_staff: boolean
  is_email_verified: boolean
  signup_source: SignupSource
  date_joined: string
  plan: AdminPlan
  // 유료 결제 중이면 다음 결제일, 관리자가 부여한 플랜이면 유지되는 마지막 날
  // (null이면 기간 제한 없음).
  plan_period_end: string | null
  is_plan_admin_granted: boolean
}

/** 관리자 목록 API 공통 응답. 한 페이지는 20건이다(백엔드 AdminPagination). */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const ADMIN_PAGE_SIZE = 20

export type InquiryCategory = 'general' | 'billing' | 'bug' | 'feature' | 'other'

export interface AdminInquiry {
  id: number
  user_id: number
  user_email: string
  user_name: string
  category: InquiryCategory
  title: string
  content: string
  reply: string
  is_answered: boolean
  created_at: string
}

export type AdminPlan = 'free' | 'basic' | 'pro'

export interface AdminOverview {
  users: {
    total: number
    inactive: number
    new_this_month: number
    by_signup_source: Record<SignupSource, number>
    monthly_signups: { month: string; count: number }[]
  }
  items: { total: number }
  subscriptions: {
    by_plan: Record<AdminPlan, number>
    admin_granted: number
    // 관리자가 부여한 플랜 중 7일 안에 끝나는 것.
    grants_expiring_soon: number
  }
  inquiries: { unanswered: number }
  revenue: { total: number; this_month: number }
}

export type PaymentStatus = 'succeeded' | 'failed'

export interface AdminPayment {
  id: number
  user_email: string
  plan: AdminPlan
  amount: number
  status: PaymentStatus
  order_id: string
  failure_reason: string
  paid_at: string | null
  created_at: string
}

export type AdminAction =
  | 'user_deactivate'
  | 'user_reactivate'
  | 'plan_grant'
  | 'inquiry_reply'
  | 'notice_send'

export interface AdminActionLog {
  id: number
  // 계정이 지워진 관리자/회원은 null이다.
  actor_email: string | null
  action: AdminAction
  target_user_id: number | null
  target_user_email: string | null
  summary: string
  created_at: string
}

/** 회원 상세 화면용. 결제·문의·작업 기록은 전부가 아니라 최근 몇 건만 온다. */
export interface AdminUserSummary {
  user: AdminUser
  item_count: number
  payments: AdminPayment[]
  inquiries: AdminInquiry[]
  logs: AdminActionLog[]
}

export type NoticeAudience = 'all' | AdminPlan

export interface UserListParams {
  search?: string
  plan?: AdminPlan
  signupSource?: SignupSource
  isActive?: boolean
  page?: number
}

export async function listUsers(params: UserListParams = {}): Promise<Paginated<AdminUser>> {
  const { data } = await api.get<Paginated<AdminUser>>('/auth/admin/users/', {
    params: {
      search: params.search || undefined,
      plan: params.plan,
      signup_source: params.signupSource,
      is_active: params.isActive,
      page: params.page,
    },
  })
  return data
}

export async function getUserSummary(id: number): Promise<AdminUserSummary> {
  const { data } = await api.get<AdminUserSummary>(`/admin/users/${id}/summary/`)
  return data
}

export async function setUserActive(id: number, isActive: boolean): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/auth/admin/users/${id}/`, {
    is_active: isActive,
  })
  return data
}

/** 결제 없이 유저의 플랜을 바꾼다. periodEnd를 비우면 기간 제한 없이 유지된다. */
export async function grantUserPlan(id: number, plan: AdminPlan, periodEnd: string | null): Promise<void> {
  await api.patch(`/billing/admin/users/${id}/subscription/`, { plan, period_end: periodEnd })
}

export interface InquiryListParams {
  answered?: boolean
  category?: InquiryCategory
  page?: number
  pageSize?: number
}

export async function listInquiries(params: InquiryListParams = {}): Promise<Paginated<AdminInquiry>> {
  const { data } = await api.get<Paginated<AdminInquiry>>('/support/admin/inquiries/', {
    params: {
      answered: params.answered,
      category: params.category,
      page: params.page,
      page_size: params.pageSize,
    },
  })
  return data
}

export async function replyToInquiry(id: number, reply: string): Promise<AdminInquiry> {
  const { data } = await api.patch<AdminInquiry>(`/support/admin/inquiries/${id}/`, { reply })
  return data
}

export async function getOverview(): Promise<AdminOverview> {
  const { data } = await api.get<AdminOverview>('/admin/overview/')
  return data
}

export async function listPayments(page?: number): Promise<Paginated<AdminPayment>> {
  const { data } = await api.get<Paginated<AdminPayment>>('/billing/admin/payments/', {
    params: { page },
  })
  return data
}

export async function listLogs(params: { action?: AdminAction; page?: number } = {}): Promise<
  Paginated<AdminActionLog>
> {
  const { data } = await api.get<Paginated<AdminActionLog>>('/admin/logs/', { params })
  return data
}

/** 공지를 인앱 알림으로 보낸다. 받은 회원 수가 돌아온다. 되돌릴 수 없다. */
export async function sendNotice(payload: {
  title: string
  message: string
  audience: NoticeAudience
}): Promise<{ recipient_count: number }> {
  const { data } = await api.post<{ recipient_count: number }>('/notifications/admin/notices/', payload)
  return data
}
