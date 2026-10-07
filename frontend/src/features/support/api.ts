import { api } from '../../lib/api'

export type InquiryCategory = 'general' | 'billing' | 'bug' | 'feature' | 'other'

export interface InquiryPayload {
  category: InquiryCategory
  title: string
  content: string
}

export interface Inquiry extends InquiryPayload {
  id: number
  reply: string
  is_answered: boolean
  created_at: string
}

export async function createInquiry(payload: InquiryPayload): Promise<Inquiry> {
  const { data } = await api.post<Inquiry>('/support/inquiries/', payload)
  return data
}

export async function listMyInquiries(): Promise<Inquiry[]> {
  const { data } = await api.get<Inquiry[]>('/support/inquiries/')
  return data
}
