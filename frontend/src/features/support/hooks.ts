import { useMutation } from '@tanstack/react-query'
import * as supportApi from './api'

export function useCreateInquiryMutation() {
  return useMutation({
    mutationFn: (payload: supportApi.InquiryPayload) => supportApi.createInquiry(payload),
  })
}
