import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as itemsApi from './api'
import type { ExpiryItemPayload, ListItemsParams } from './api'

export function useItemsQuery(params?: ListItemsParams) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: () => itemsApi.listItems(params),
  })
}

export function useItemStatsQuery() {
  return useQuery({
    queryKey: ['items', 'stats'],
    queryFn: () => itemsApi.getItemStats(),
  })
}

export function useMonthlyCalendarQuery(year: number, month: number) {
  return useQuery({
    queryKey: ['items', 'calendar', year, month],
    queryFn: () => itemsApi.getMonthlyCalendar({ year, month }),
  })
}

export function useItemQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: ['items', 'detail', id],
    queryFn: () => itemsApi.getItem(id as string | number),
    enabled: id !== undefined,
  })
}

export function useCreateItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ExpiryItemPayload) => itemsApi.createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: ExpiryItemPayload }) =>
      itemsApi.updateItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useDeleteItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => itemsApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
