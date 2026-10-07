import { api } from '../../lib/api'
import type { SignupSource } from '../auth/api'

export interface AdminUser {
  id: number
  email: string
  name: string
  is_active: boolean
  is_email_verified: boolean
  signup_source: SignupSource
  date_joined: string
}

export type InquiryCategory = 'general' | 'billing' | 'bug' | 'feature' | 'other'

export interface AdminInquiry {
  id: number
  user_email: string
  user_name: string
  category: InquiryCategory
  title: string
  content: string
  is_answered: boolean
  created_at: string
}

export async function listUsers(search?: string): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/auth/admin/users/', {
    params: search ? { search } : undefined,
  })
  return data
}

export async function listInquiries(): Promise<AdminInquiry[]> {
  const { data } = await api.get<AdminInquiry[]>('/support/admin/inquiries/')
  return data
}

export async function setInquiryAnswered(id: number, isAnswered: boolean): Promise<AdminInquiry> {
  const { data } = await api.patch<AdminInquiry>(`/support/admin/inquiries/${id}/`, {
    is_answered: isAnswered,
  })
  return data
}
