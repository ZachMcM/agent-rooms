import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase, type Database } from '../client'
import { runMigrations } from '../migrator'
import { memberships, messages, rooms } from '../schema'
import {
  getRoomDetail,
  getRoomMessages,
  getRoomMembers,
  InvalidSearchLimitError,
  listRoomOverviews,
  searchRoomsAndMessages,
} from './dashboard'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-dashboard-'))
  directories.push(directory)
  const db = createDatabase(`file:${join(directory, 'db.sqlite')}`)
  await runMigrations(db)
  return db
}

async function insertRoom(db: Database, id: string, name: string) {
  const [room] = await db.insert(rooms).values({ id, name }).returning()

  if (!room) {
    throw new Error('Expected room insert to return a row')
  }

  return room
}

describe('dashboard operations', () => {
  it('lists every room alphabetically with deterministic minimal members', async () => {
    const db = await createTestDatabase()
    const zulu = await insertRoom(db, 'room-zulu', 'zulu')
    const alpha = await insertRoom(db, 'room-alpha', 'Alpha')
    const empty = await insertRoom(db, 'room-empty', 'middle')

    await db.insert(memberships).values([
      {
        id: 'member-z',
        roomId: zulu.id,
        conversationId: 'legacy-conversation',
        status: 'inactive',
      },
      {
        id: 'member-b',
        roomId: alpha.id,
        conversationId: 'claude-alpha-b',
      },
      {
        id: 'member-a',
        roomId: alpha.id,
        conversationId: 'codex-alpha-a',
        status: 'inactive',
      },
    ])

    await expect(listRoomOverviews(db)).resolves.toEqual([
      {
        room: alpha,
        members: [
          { id: 'member-a', conversationId: 'codex-alpha-a', status: 'inactive' },
          { id: 'member-b', conversationId: 'claude-alpha-b', status: 'active' },
        ],
      },
      { room: empty, members: [] },
      {
        room: zulu,
        members: [{ id: 'member-z', conversationId: 'legacy-conversation', status: 'inactive' }],
      },
    ])
  })

  it('returns active and inactive members with counts and their greatest-id message', async () => {
    const db = await createTestDatabase()
    const room = await insertRoom(db, 'room', 'build')
    const firstJoinedAt = new Date('2026-01-01T00:00:00.000Z')
    const secondJoinedAt = new Date('2026-01-02T00:00:00.000Z')

    await db.insert(memberships).values([
      {
        id: 'member-active',
        roomId: room.id,
        conversationId: 'cursor-active-conversation',
        cursor: 3,
        createdAt: firstJoinedAt,
      },
      {
        id: 'member-inactive',
        roomId: room.id,
        conversationId: 'legacy-conversation',
        status: 'inactive',
        cursor: 9,
        createdAt: secondJoinedAt,
      },
    ])

    const createdAt = new Date('2026-01-03T00:00:00.000Z')
    await db.insert(messages).values([
      {
        id: 3,
        roomId: room.id,
        membershipId: 'member-active',
        kind: 'answer',
        body: 'latest by insertion order but not id',
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
      },
      {
        id: 1,
        roomId: room.id,
        membershipId: 'member-active',
        kind: 'decision',
        body: 'decision',
        createdAt,
      },
      {
        id: 2,
        roomId: room.id,
        membershipId: 'member-active',
        kind: 'warning',
        body: 'warning',
        createdAt,
      },
      {
        id: 4,
        roomId: room.id,
        membershipId: 'member-active',
        kind: 'question',
        body: 'question',
        createdAt,
      },
      {
        id: 5,
        roomId: room.id,
        membershipId: 'member-active',
        kind: 'status',
        body: 'greatest id',
        createdAt,
      },
      {
        id: 6,
        roomId: room.id,
        membershipId: 'member-active',
        kind: 'decision',
        body: 'actual greatest id',
        createdAt,
      },
    ])

    await expect(getRoomMembers(db, { roomId: room.id })).resolves.toEqual({
      room,
      members: [
        {
          id: 'member-active',
          conversationId: 'cursor-active-conversation',
          status: 'active',
          joinedAt: firstJoinedAt,
          cursor: 3,
          messageCounts: {
            total: 6,
            decision: 2,
            warning: 1,
            question: 1,
            answer: 1,
            status: 1,
          },
          mostRecentMessage: {
            id: 6,
            kind: 'decision',
            body: 'actual greatest id',
            createdAt,
          },
        },
        {
          id: 'member-inactive',
          conversationId: 'legacy-conversation',
          status: 'inactive',
          joinedAt: secondJoinedAt,
          cursor: 9,
          messageCounts: {
            total: 0,
            decision: 0,
            warning: 0,
            question: 0,
            answer: 0,
            status: 0,
          },
          mostRecentMessage: null,
        },
      ],
    })
  })

  it('returns an empty member list for a room with no memberships and undefined for a missing room', async () => {
    const db = await createTestDatabase()
    const room = await insertRoom(db, 'empty-room', 'empty')

    await expect(getRoomMembers(db, { roomId: room.id })).resolves.toEqual({ room, members: [] })
    await expect(getRoomMembers(db, { roomId: 'missing' })).resolves.toBeUndefined()
  })

  it('returns members and messages together for one room', async () => {
    const db = await createTestDatabase()
    const room = await insertRoom(db, 'detail-room', 'detail')

    await expect(getRoomDetail(db, { roomId: room.id })).resolves.toEqual({
      room,
      members: [],
      messages: [],
    })
    await expect(getRoomDetail(db, { roomId: 'missing' })).resolves.toBeUndefined()
  })

  it('lists messages from existing rooms without changing member cursors', async () => {
    const db = await createTestDatabase()
    const room = await insertRoom(db, 'closed-room', 'closed')
    const answerMembership = {
      id: 'answer-member',
      roomId: room.id,
      conversationId: 'answer-conversation',
      status: 'inactive' as const,
      cursor: 1,
    }
    const inactiveMembership = {
      id: 'inactive-member',
      roomId: room.id,
      conversationId: 'inactive-conversation',
      status: 'inactive' as const,
      cursor: 2,
    }

    await db.insert(memberships).values([answerMembership, inactiveMembership])
    const [question, answer] = await db
      .insert(messages)
      .values([
        {
          id: 2,
          roomId: room.id,
          membershipId: inactiveMembership.id,
          kind: 'question',
          body: 'Which plan?',
        },
        {
          id: 3,
          roomId: room.id,
          membershipId: answerMembership.id,
          kind: 'answer',
          body: 'The approved plan.',
          replyToMessageId: 2,
        },
      ])
      .returning()

    if (!question || !answer) {
      throw new Error('Expected message setup to return rows')
    }

    await expect(getRoomMessages(db, { roomId: room.id })).resolves.toEqual({
      room,
      messages: [
        {
          ...question,
          membership: {
            id: inactiveMembership.id,
            conversationId: inactiveMembership.conversationId,
            status: inactiveMembership.status,
          },
          replyTo: null,
        },
        {
          ...answer,
          membership: {
            id: answerMembership.id,
            conversationId: answerMembership.conversationId,
            status: answerMembership.status,
          },
          replyTo: {
            id: question.id,
            kind: question.kind,
            body: question.body,
            membership: {
              id: inactiveMembership.id,
              conversationId: inactiveMembership.conversationId,
              status: inactiveMembership.status,
            },
          },
        },
      ],
    })
    await expect(getRoomMessages(db, { roomId: 'missing' })).resolves.toBeUndefined()

    const emptyRoom = await insertRoom(db, 'empty-room', 'empty')
    await expect(getRoomMessages(db, { roomId: emptyRoom.id })).resolves.toEqual({
      room: emptyRoom,
      messages: [],
    })
    await expect(
      db
        .select({ id: memberships.id, cursor: memberships.cursor })
        .from(memberships)
        .orderBy(memberships.id),
    ).resolves.toEqual([
      { id: answerMembership.id, cursor: answerMembership.cursor },
      { id: inactiveMembership.id, cursor: inactiveMembership.cursor },
    ])
  })

  it('searches case-insensitive literal substrings and scopes only message results', async () => {
    const db = await createTestDatabase()
    const firstRoom = await insertRoom(db, 'first-room', 'Needle %_ Room')
    const secondRoom = await insertRoom(db, 'second-room', 'needle elsewhere')

    await db.insert(memberships).values([
      {
        id: 'first-member',
        roomId: firstRoom.id,
        conversationId: 'claude-first-conversation',
      },
      {
        id: 'second-member',
        roomId: secondRoom.id,
        conversationId: 'gemini-second-conversation',
      },
    ])
    await db.insert(messages).values([
      {
        id: 1,
        roomId: firstRoom.id,
        membershipId: 'first-member',
        kind: 'warning',
        body: 'A NEEDLE and 100%_ literal',
      },
      {
        id: 2,
        roomId: secondRoom.id,
        membershipId: 'second-member',
        kind: 'status',
        body: 'newest needle',
      },
    ])

    const scoped = await searchRoomsAndMessages(db, {
      query: '  nEeDlE  ',
      roomId: firstRoom.id,
    })

    expect(scoped.rooms.map((room) => room.id)).toEqual([firstRoom.id, secondRoom.id])
    expect(scoped.messages).toHaveLength(1)
    expect(scoped.messages[0]).toMatchObject({
      room: { id: firstRoom.id, name: firstRoom.name },
      member: {
        id: 'first-member',
        conversationId: 'claude-first-conversation',
      },
      message: { id: 1, kind: 'warning', body: 'A NEEDLE and 100%_ literal' },
    })

    const percent = await searchRoomsAndMessages(db, { query: '%' })
    expect(percent.rooms.map((room) => room.id)).toEqual([firstRoom.id])
    expect(percent.messages.map((hit) => hit.message.id)).toEqual([1])

    const underscore = await searchRoomsAndMessages(db, { query: '_' })
    expect(underscore.rooms.map((room) => room.id)).toEqual([firstRoom.id])
    expect(underscore.messages.map((hit) => hit.message.id)).toEqual([1])
  })

  it('sorts messages newest first and applies the limit independently to each result group', async () => {
    const db = await createTestDatabase()
    const seeds = Array.from({ length: 21 }, (_, index) => {
      const suffix = index.toString().padStart(2, '0')

      return {
        room: { id: `room-${suffix}`, name: `match-${suffix}` },
        member: {
          id: `member-${suffix}`,
          roomId: `room-${suffix}`,
          conversationId: `codex-conversation-${suffix}`,
        },
        message: {
          roomId: `room-${suffix}`,
          membershipId: `member-${suffix}`,
          kind: 'status' as const,
          body: `match ${suffix}`,
        },
      }
    })

    await db.insert(rooms).values(seeds.map((seed) => seed.room))
    await db.insert(memberships).values(seeds.map((seed) => seed.member))
    await db.insert(messages).values(seeds.map((seed) => seed.message))

    const defaultResults = await searchRoomsAndMessages(db, { query: 'match' })
    expect(defaultResults.rooms).toHaveLength(20)
    expect(defaultResults.messages).toHaveLength(20)
    expect(defaultResults.rooms[0]?.name).toBe('match-00')
    expect(defaultResults.rooms.at(-1)?.name).toBe('match-19')
    expect(defaultResults.messages.map((hit) => hit.message.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => 21 - index),
    )

    const limited = await searchRoomsAndMessages(db, { query: 'match', limit: 1 })
    expect(limited.rooms.map((room) => room.name)).toEqual(['match-00'])
    expect(limited.messages.map((hit) => hit.message.id)).toEqual([21])
  })

  it('returns empty results for blank searches and rejects invalid limits with a typed error', async () => {
    const db = await createTestDatabase()

    await expect(searchRoomsAndMessages(db, { query: '   ' })).resolves.toEqual({
      rooms: [],
      messages: [],
    })

    await Promise.all(
      [0, -1, 1.5, 51, Number.NaN].map((limit) =>
        expect(searchRoomsAndMessages(db, { query: 'match', limit })).rejects.toBeInstanceOf(
          InvalidSearchLimitError,
        ),
      ),
    )
  })
})
