import { api } from '../../lib/api'

export type Plan = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled'

export interface Subscription {
  plan: Plan
  status: SubscriptionStatus
  customer_key: string
  current_period_end: string | null
}

export type PaymentStatus = 'succeeded' | 'failed'

export interface Payment {
  id: number
  amount: number
  status: PaymentStatus
  order_id: string
  paid_at: string | null
  created_at: string
}

export async function getSubscription(): Promise<Subscription> {
  const { data } = await api.get<Subscription>('/billing/subscription/')
  return data
}

export async function subscribe(authKey: string): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/billing/subscribe/', { auth_key: authKey })
  return data
}

export async function cancelSubscription(): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/billing/cancel/')
  return data
}

export async function listPayments(): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>('/billing/payments/')
  return data
}
