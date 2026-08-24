import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as billingApi from './api'

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
    mutationFn: (authKey: string) => billingApi.subscribe(authKey),
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
