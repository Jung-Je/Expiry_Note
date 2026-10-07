import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as supportApi from './api'

export function useMyInquiriesQuery() {
  return useQuery({
    queryKey: ['support', 'inquiries'],
    queryFn: supportApi.listMyInquiries,
  })
}

export function useCreateInquiryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: supportApi.InquiryPayload) => supportApi.createInquiry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'inquiries'] })
    },
  })
}
