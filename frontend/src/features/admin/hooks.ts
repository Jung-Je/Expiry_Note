import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from './api'

export function useAdminUsersQuery(search: string) {
  return useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.listUsers(search || undefined),
  })
}

export function useAdminInquiriesQuery() {
  return useQuery({
    queryKey: ['admin', 'inquiries'],
    queryFn: adminApi.listInquiries,
  })
}

export function useReplyToInquiryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      adminApi.replyToInquiry(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
    },
  })
}
