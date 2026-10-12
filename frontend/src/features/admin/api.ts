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

export type InquiryCategory = 'general' | 'billing' | 'bug' | 'feature' | 'other'

export interface AdminInquiry {
  id: number
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
    new_this_month: number
    by_signup_source: Record<SignupSource, number>
    monthly_signups: { month: string; count: number }[]
  }
  items: { total: number }
  subscriptions: { by_plan: Record<AdminPlan, number> }
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

export async function listUsers(search?: string): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/auth/admin/users/', {
    params: search ? { search } : undefined,
  })
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

export async function listInquiries(): Promise<AdminInquiry[]> {
  const { data } = await api.get<AdminInquiry[]>('/support/admin/inquiries/')
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

export async function listPayments(): Promise<AdminPayment[]> {
  const { data } = await api.get<AdminPayment[]>('/billing/admin/payments/')
  return data
}
