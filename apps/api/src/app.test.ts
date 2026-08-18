import { once } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { InvalidSearchLimitError, type Database } from '@agent-rooms/db'
import type * as AgentRoomsDatabase from '@agent-rooms/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from './app'

const database = {} as Database
const { getRoomDetail, listRoomOverviews, searchRoomsAndMessages } = vi.hoisted(() => ({
  getRoomDetail: vi.fn(),
  listRoomOverviews: vi.fn(),
  searchRoomsAndMessages: vi.fn(),
}))

vi.mock('@agent-rooms/db', async (importOriginal) => {
  const original = await importOriginal<typeof AgentRoomsDatabase>()
  return { ...original, getRoomDetail, listRoomOverviews, searchRoomsAndMessages }
})

const app = createApp({ getDatabase: vi.fn(async () => database) })

describe('API server', () => {
  beforeEach(() => vi.clearAllMocks())

  it('preserves dashboard REST payloads', async () => {
    const createdAt = new Date('2026-08-17T09:00:00.000Z')
    listRoomOverviews.mockResolvedValue([
      { room: { id: 'room-1', name: 'Launch', createdAt }, members: [], lastActivityAt: createdAt },
    ])
    getRoomDetail.mockResolvedValue({
      room: { id: 'room-1', name: 'Launch', createdAt },
      members: [],
      messages: [],
    })
    searchRoomsAndMessages.mockResolvedValue({ rooms: [], messages: [] })

    await expect(request('/api/health')).resolves.toMatchObject({ status: 200, body: { ok: true } })
    await expect(request('/api/rooms')).resolves.toMatchObject({
      status: 200,
      body: [
        {
          room: { id: 'room-1', name: 'Launch', createdAt: createdAt.toISOString() },
          members: [],
          lastActivityAt: createdAt.toISOString(),
        },
      ],
    })
    await expect(request('/api/rooms/room-1')).resolves.toMatchObject({
      status: 200,
      body: {
        room: { id: 'room-1', name: 'Launch', createdAt: createdAt.toISOString() },
        members: [],
        messages: [],
      },
    })
    getRoomDetail.mockResolvedValueOnce(undefined)
    await expect(request('/api/rooms/missing')).resolves.toMatchObject({
      status: 404,
      body: { error: { code: 'room_not_found', message: 'Room not found' } },
    })
    await expect(request('/api/search?roomId=')).resolves.toMatchObject({
      status: 200,
      body: { rooms: [], messages: [] },
    })
    expect(searchRoomsAndMessages).toHaveBeenCalledWith(database, {
      query: '',
      roomId: undefined,
      limit: undefined,
    })
    searchRoomsAndMessages.mockRejectedValueOnce(new InvalidSearchLimitError())
    await expect(request('/api/search?limit=not-a-number')).resolves.toMatchObject({
      status: 400,
      body: {
        error: {
          code: 'invalid_search_limit',
          message: 'Search limit must be an integer between 1 and 50',
        },
      },
    })
    await expect(request('/api/missing')).resolves.toMatchObject({
      status: 404,
      body: { error: { code: 'not_found', message: 'Not found' } },
    })
  })

  it('shields unexpected failures', async () => {
    listRoomOverviews.mockRejectedValue(new Error('database unavailable'))
    await expect(request('/api/rooms')).resolves.toMatchObject({
      status: 500,
      body: { error: { code: 'internal_error', message: 'Internal server error' } },
    })
  })

  it('serves SPA history requests without swallowing unknown API routes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-api-'))
    await writeFile(join(directory, 'index.html'), '<h1>Agent Rooms</h1>')
    const staticApp = createApp({
      getDatabase: vi.fn(async () => database),
      publicDirectory: directory,
    })

    try {
      await expect(requestFrom(staticApp, '/rooms/room-1')).resolves.toMatchObject({
        status: 200,
        body: '<h1>Agent Rooms</h1>',
      })
      await expect(requestFrom(staticApp, '/api/missing')).resolves.toMatchObject({
        status: 404,
        body: { error: { code: 'not_found', message: 'Not found' } },
      })
    } finally {
      await rm(directory, { recursive: true })
    }
  })
})

async function request(path: string): Promise<{ status: number; body: unknown }> {
  return requestFrom(app, path)
}

async function requestFrom(
  target: ReturnType<typeof createApp>,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const server = target.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Server did not bind to a port.')
    const httpResponse = await fetch(`http://127.0.0.1:${address.port}${path}`)
    const body = httpResponse.headers.get('content-type')?.includes('application/json')
      ? await httpResponse.json()
      : await httpResponse.text()
    return { status: httpResponse.status, body }
  } finally {
    server.close()
    await once(server, 'close')
  }
}
