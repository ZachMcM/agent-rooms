import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../client'
import { runMigrations } from '../migrator'
import { getRoomMembers, listRoomOverviews, searchRoomsAndMessages } from '../operations/dashboard'
import { listRoomMessages } from '../operations/messages'
import { seedDashboardDatabase } from './seed'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-dashboard-seed-'))
  directories.push(directory)
  const db = createDatabase(`file:${join(directory, 'db.sqlite')}`)
  await runMigrations(db)
  return db
}

describe('seedDashboardDatabase', () => {
  it('reseeds deterministic dashboard data through the dashboard read operations', async () => {
    const db = await createTestDatabase()

    await expect(seedDashboardDatabase(db)).resolves.toEqual({
      rooms: 4,
      memberships: 7,
      messages: 9,
    })
    await expect(seedDashboardDatabase(db)).resolves.toEqual({
      rooms: 4,
      memberships: 7,
      messages: 9,
    })

    const overviews = await listRoomOverviews(db)
    expect(
      overviews.map(({ room, members }) => ({
        room: room.id,
        members: members.map((member) => [member.id, member.status]),
      })),
    ).toEqual([
      {
        room: 'room-closed-retrospective',
        members: [
          ['membership-closed-former-codex', 'inactive'],
          ['membership-closed-former-cursor', 'inactive'],
        ],
      },
      {
        room: 'room-dashboard-launch',
        members: [
          ['membership-launch-claude', 'active'],
          ['membership-launch-codex', 'active'],
          ['membership-launch-cursor', 'active'],
        ],
      },
      { room: 'room-empty-planning', members: [] },
      {
        room: 'room-history-review',
        members: [
          ['membership-history-former-claude', 'inactive'],
          ['membership-history-gemini', 'active'],
        ],
      },
    ])

    const launch = await getRoomMembers(db, { roomId: 'room-dashboard-launch' })
    expect(launch).toMatchObject({
      members: [
        {
          id: 'membership-launch-codex',
          cursor: 2,
          messageCounts: { total: 2, decision: 1, answer: 1 },
          mostRecentMessage: { id: 3, kind: 'answer' },
        },
        {
          id: 'membership-launch-claude',
          cursor: 5,
          messageCounts: { total: 2, question: 1, status: 1 },
          mostRecentMessage: { id: 5, kind: 'status' },
        },
        {
          id: 'membership-launch-cursor',
          cursor: 1,
          messageCounts: { total: 1, warning: 1 },
          mostRecentMessage: { id: 4, kind: 'warning' },
        },
      ],
    })

    const search = await searchRoomsAndMessages(db, { query: 'dashboard' })
    expect(search.rooms.map((room) => room.id)).toEqual(['room-dashboard-launch'])
    expect(search.messages.map((hit) => hit.message.id)).toEqual([9, 7, 6, 5, 2, 1])

    const messages = await listRoomMessages(db, { conversationId: 'codex-dashboard-launch' })
    expect(messages?.messages.find((message) => message.id === 3)).toMatchObject({
      kind: 'answer',
      replyTo: { id: 2, kind: 'question' },
    })
  })
})
