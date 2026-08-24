import { api } from '../../lib/api'

export type ItemCategory = 'subscription' | 'contract' | 'warranty' | 'membership' | 'insurance' | 'other'
export type ItemStatus = 'expired' | 'urgent' | 'upcoming' | 'normal'

export interface ExpiryItem {
  id: number
  title: string
  category: ItemCategory
  expiry_date: string
  amount: number | null
  memo: string
  notify_days_before: number
  days_until_expiry: number
  status: ItemStatus
  created_at: string
  updated_at: string
}

export interface ExpiryItemPayload {
  title: string
  category: ItemCategory
  expiry_date: string
  amount: number | null
  memo: string
  notify_days_before: number
}

export interface ListItemsParams {
  category?: string
  status?: string
  search?: string
  date?: string
}

export interface CategoryStat {
  category: ItemCategory
  label: string
  count: number
}

export interface StatusStat {
  status: ItemStatus
  label: string
  count: number
}

export interface MonthlyAmount {
  month: string
  total_amount: number
}

export interface ItemStats {
  total_count: number
  expiring_soon_count: number
  by_category: CategoryStat[]
  by_status: StatusStat[]
  monthly_amounts: MonthlyAmount[]
}

export async function listItems(params?: ListItemsParams): Promise<ExpiryItem[]> {
  const { data } = await api.get<ExpiryItem[]>('/items/', { params })
  return data
}

export async function getItem(id: number | string): Promise<ExpiryItem> {
  const { data } = await api.get<ExpiryItem>(`/items/${id}/`)
  return data
}

export async function createItem(payload: ExpiryItemPayload): Promise<ExpiryItem> {
  const { data } = await api.post<ExpiryItem>('/items/', payload)
  return data
}

export async function updateItem(
  id: number | string,
  payload: ExpiryItemPayload,
): Promise<ExpiryItem> {
  const { data } = await api.patch<ExpiryItem>(`/items/${id}/`, payload)
  return data
}

export async function deleteItem(id: number | string): Promise<void> {
  await api.delete(`/items/${id}/`)
}

export async function getItemStats(): Promise<ItemStats> {
  const { data } = await api.get<ItemStats>('/items/stats/')
  return data
}
