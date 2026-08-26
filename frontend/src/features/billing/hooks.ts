import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as billingApi from './api'
import type { PaidPlan } from './api'

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: billingApi.getSubscription,
  })
}

export function usePaymentsQuery() {
  return useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: billingApi.listPayments,
  })
}

export function useSubscribeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ authKey, plan }: { authKey: string; plan: PaidPlan }) =>
      billingApi.subscribe(authKey, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    },
  })
}

export function useChangePlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plan: PaidPlan) => billingApi.changePlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    },
  })
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    },
  })
}
