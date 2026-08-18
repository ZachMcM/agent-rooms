import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { getRoomDetail } from './api'
import {
  roomDetailQueryOptions,
  roomMembersQueryKey,
  roomOverviewsQueryOptions,
  searchQueryOptions,
} from './queries'

vi.mock('./api', () => ({
  getRoomDetail: vi.fn(),
  getRoomOverviews: vi.fn(),
  searchRooms: vi.fn(),
}))

describe('dashboard queries', () => {
  it('caches members included in a room detail response', async () => {
    const queryClient = new QueryClient()
    const detail = {
      room: { id: 'room-1', name: 'Launch', createdAt: '2026-08-17T09:00:00.000Z' },
      members: [
        {
          id: 'member-1',
          conversationId: 'codex',
          status: 'active' as const,
          joinedAt: '2026-08-17T09:00:00.000Z',
          cursor: 0,
          messageCounts: { total: 0, decision: 0, warning: 0, question: 0, answer: 0, status: 0 },
          mostRecentMessage: null,
        },
      ],
      messages: [],
    }
    vi.mocked(getRoomDetail).mockResolvedValue(detail)

    await queryClient.fetchQuery(roomDetailQueryOptions(queryClient, 'room-1'))

    expect(queryClient.getQueryData(roomMembersQueryKey('room-1'))).toEqual(detail.members)
  })

  it('disables search until a user submits one', () => {
    expect(searchQueryOptions(undefined).enabled).toBe(false)
    expect(searchQueryOptions({ query: 'launch' }).enabled).toBe(true)
  })

  it('refreshes room state every 500 milliseconds', () => {
    const queryClient = new QueryClient()

    expect(roomOverviewsQueryOptions.refetchInterval).toBe(500)
    expect(roomDetailQueryOptions(queryClient, 'room-1').refetchInterval).toBe(500)
    expect(searchQueryOptions({ query: 'launch' }).refetchInterval).toBe(5_000)
  })
})
