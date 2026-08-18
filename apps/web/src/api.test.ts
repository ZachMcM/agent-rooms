import {
  InvalidSearchLimitError,
  getRoomMembers,
  getRoomMessages,
  listRoomOverviews,
  searchRoomsAndMessages,
  type ListedRoomMessages,
  type RoomMembers,
} from '@agent-rooms/db'
import type * as AgentRoomsDatabase from '@agent-rooms/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDatabase } from './routes/api/-database'
import { getHealth } from './routes/api/health'
import { getRoom } from './routes/api/rooms/$roomId'
import { getRooms } from './routes/api/rooms/index'
import { getSearch } from './routes/api/search'

vi.mock('@agent-rooms/db', async (importOriginal) => {
  const original = await importOriginal<typeof AgentRoomsDatabase>()

  return {
    ...original,
    getRoomMembers: vi.fn(),
    getRoomMessages: vi.fn(),
    listRoomOverviews: vi.fn(),
    searchRoomsAndMessages: vi.fn(),
  }
})

vi.mock('./routes/api/-database', () => ({ getDatabase: vi.fn() }))

const database = {} as Awaited<ReturnType<typeof getDatabase>>

describe('API routes', () => {
  beforeEach(() => {
    vi.mocked(getDatabase).mockResolvedValue(database)
  })

  it('returns the health payload', async () => {
    const response = getHealth()

    expect(await response.json()).toEqual({ ok: true })
  })

  it('returns room overviews', async () => {
    vi.mocked(listRoomOverviews).mockResolvedValue([])

    const response = await getRooms()

    expect(await response.json()).toEqual([])
    expect(listRoomOverviews).toHaveBeenCalledWith(database)
  })

  it('returns a room with members and messages', async () => {
    const createdAt = new Date('2026-08-17T09:00:00.000Z')
    const room = { id: 'room-1', name: 'Launch', createdAt }
    const roomData: RoomMembers = { room, members: [] }
    const messagesData: ListedRoomMessages = { room, messages: [] }
    vi.mocked(getRoomMembers).mockResolvedValue(roomData)
    vi.mocked(getRoomMessages).mockResolvedValue(messagesData)

    const response = await getRoom('room-1')

    expect(await response.json()).toEqual({
      room: { ...room, createdAt: createdAt.toISOString() },
      members: [],
      messages: [],
    })
    expect(getRoomMembers).toHaveBeenCalledWith(database, { roomId: 'room-1' })
    expect(getRoomMessages).toHaveBeenCalledWith(database, { roomId: 'room-1' })
  })

  it('returns a JSON 404 for a missing room', async () => {
    vi.mocked(getRoomMembers).mockResolvedValue(undefined)
    vi.mocked(getRoomMessages).mockResolvedValue(undefined)

    const response = await getRoom('missing')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: 'room_not_found', message: 'Room not found' },
    })
  })

  it('searches with empty defaults and omits a blank room ID', async () => {
    vi.mocked(searchRoomsAndMessages).mockResolvedValue({ rooms: [], messages: [] })

    const response = await getSearch(new Request('http://localhost/api/search?roomId='))

    expect(await response.json()).toEqual({ rooms: [], messages: [] })
    expect(searchRoomsAndMessages).toHaveBeenCalledWith(database, {
      query: '',
      roomId: undefined,
      limit: undefined,
    })
  })

  it('returns a JSON 400 for an invalid search limit', async () => {
    vi.mocked(searchRoomsAndMessages).mockRejectedValue(new InvalidSearchLimitError())

    const response = await getSearch(new Request('http://localhost/api/search?limit=0'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_search_limit',
        message: 'Search limit must be an integer between 1 and 50',
      },
    })
  })

  it('returns a JSON 500 for an unexpected failure', async () => {
    vi.mocked(listRoomOverviews).mockRejectedValue(new Error('database unavailable'))

    const response = await getRooms()

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: { code: 'internal_error', message: 'Internal server error' },
    })
  })
})
