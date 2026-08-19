import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../client'
import { runMigrations } from '../migrator'
import {
  getRoomMembers,
  getRoomMessages,
  listRoomOverviews,
  searchRoomsAndMessages,
} from '../operations/dashboard'
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
      messages: 30,
    })
    await expect(seedDashboardDatabase(db)).resolves.toEqual({
      rooms: 4,
      memberships: 7,
      messages: 30,
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
          ['membership-history-codex', 'active'],
          ['membership-history-former-claude', 'inactive'],
        ],
      },
    ])

    const launch = await getRoomMembers(db, { roomId: 'room-dashboard-launch' })
    expect(launch).toMatchObject({
      members: [
        {
          id: 'membership-launch-codex',
          cursor: 2,
          messageCounts: { total: 4, decision: 1, warning: 0, question: 0, answer: 2, status: 1 },
          mostRecentMessage: { id: 10, kind: 'answer' },
        },
        {
          id: 'membership-launch-claude',
          cursor: 5,
          messageCounts: { total: 4, decision: 1, warning: 0, question: 2, answer: 0, status: 1 },
          mostRecentMessage: { id: 9, kind: 'question' },
        },
        {
          id: 'membership-launch-cursor',
          cursor: 1,
          messageCounts: { total: 4, decision: 0, warning: 2, question: 0, answer: 1, status: 1 },
          mostRecentMessage: { id: 12, kind: 'status' },
        },
      ],
    })

    const search = await searchRoomsAndMessages(db, { query: 'dashboard' })
    expect(search.rooms.map((room) => room.id)).toEqual(['room-dashboard-launch'])
    expect(search.messages.map((hit) => hit.message.id)).toEqual([
      24, 21, 14, 13, 11, 10, 9, 8, 5, 2, 1,
    ])

    const messages = await listRoomMessages(db, { conversationId: 'codex-dashboard-launch' })
    expect(messages?.messages.find((message) => message.id === 3)).toMatchObject({
      kind: 'answer',
      replyTo: { id: 2, kind: 'question' },
      body: `Use deterministic searchable messages with \`inline code\` and focused handoffs.

- Keep the data predictable.
- Exercise the compact message layout.

\`\`\`ts
const seedStatus = 'ready'
\`\`\``,
    })

    const empty = await getRoomMembers(db, { roomId: 'room-empty-planning' })
    expect(empty).toMatchObject({ members: [] })
    const emptyMessages = await getRoomMessages(db, { roomId: 'room-empty-planning' })
    expect(emptyMessages?.messages).toEqual([])
  })
})
