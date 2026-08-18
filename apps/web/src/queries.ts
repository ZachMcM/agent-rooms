import { queryOptions, type QueryClient } from '@tanstack/react-query'

import {
  getRoomDetail,
  getRoomOverviews,
  searchRooms,
  type RoomMember,
  type SearchInput,
} from './api'

const roomRefetchInterval = 500

export const roomOverviewsQueryOptions = queryOptions({
  queryKey: ['rooms'] as const,
  queryFn: getRoomOverviews,
  refetchInterval: roomRefetchInterval,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
})

export function roomMembersQueryKey(roomId: string) {
  return ['rooms', roomId, 'members'] as const
}

export function roomDetailQueryOptions(queryClient: QueryClient, roomId: string) {
  return queryOptions({
    queryKey: ['rooms', roomId] as const,
    queryFn: async () => {
      const detail = await getRoomDetail(roomId)
      queryClient.setQueryData<RoomMember[]>(roomMembersQueryKey(roomId), detail.members)
      return detail
    },
    refetchInterval: roomRefetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

export function searchQueryOptions(input: SearchInput | undefined) {
  return queryOptions({
    queryKey: ['search', input ?? null] as const,
    queryFn: () => (input ? searchRooms(input) : Promise.reject(new Error('Search is inactive'))),
    enabled: input !== undefined,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
