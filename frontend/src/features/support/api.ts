import { api } from '../../lib/api'

export type InquiryCategory = 'general' | 'billing' | 'bug' | 'feature' | 'other'

export interface InquiryPayload {
  category: InquiryCategory
  title: string
  content: string
}

export interface Inquiry extends InquiryPayload {
  id: number
  created_at: string
}

export async function createInquiry(payload: InquiryPayload): Promise<Inquiry> {
  const { data } = await api.post<Inquiry>('/support/inquiries/', payload)
  return data
}
