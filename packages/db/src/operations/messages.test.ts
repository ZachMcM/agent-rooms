import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../client'
import { runMigrations } from '../migrator'
import { memberships, messages } from '../schema'
import {
  ActiveMembershipNotFoundError,
  consumeNewMessages,
  InvalidMessagesError,
  listRoomMessages,
  writeMessages,
  type WriteMessagesInput,
} from './messages'
import { createRoom } from './rooms'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-db-'))
  directories.push(directory)
  const db = createDatabase(`file:${join(directory, 'db.sqlite')}`)
  await runMigrations(db)
  return db
}

async function addMessage(
  db: ReturnType<typeof createDatabase>,
  roomId: string,
  membershipId: string,
) {
  const [message] = await db
    .insert(messages)
    .values({ roomId, membershipId, kind: 'status', body: 'message' })
    .returning()

  if (!message) {
    throw new Error('Message creation did not return an inserted record')
  }

  return message
}

describe('message operations', () => {
  it('returns undefined without an active membership', async () => {
    const db = await createTestDatabase()

    await expect(consumeNewMessages(db, { conversationId: 'missing' })).resolves.toBeUndefined()
  })

  it('lists undefined without an active membership', async () => {
    const db = await createTestDatabase()

    await expect(listRoomMessages(db, { conversationId: 'missing' })).resolves.toBeUndefined()
  })

  it('lists active-room messages in ascending order without advancing the cursor', async () => {
    const db = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'active', conversationId: 'conversation' })
    const other = await createRoom(db, { roomName: 'other', conversationId: 'other-conversation' })
    const first = await addMessage(db, active.room.id, active.membership.id)
    await addMessage(db, other.room.id, other.membership.id)
    const last = await addMessage(db, active.room.id, active.membership.id)
    await db
      .update(memberships)
      .set({ cursor: first.id })
      .where(eq(memberships.id, active.membership.id))

    await expect(listRoomMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [first, last],
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: first.id }])
  })

  it('writes one message with the active membership without advancing its cursor', async () => {
    const db = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    const [written] = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [{ kind: 'status', body: '  work complete  ' }],
    })

    expect(written).toMatchObject({
      roomId: active.room.id,
      membershipId: active.membership.id,
      kind: 'status',
      body: '  work complete  ',
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([active.membership])
  })

  it('writes a batch atomically in input order', async () => {
    const db = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    const written = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [
        { kind: 'decision', body: 'Use SQLite.' },
        { kind: 'warning', body: 'Keep the database user-global.' },
        { kind: 'status', body: 'Database work is complete.' },
      ],
    })

    expect(written.map(({ kind, body }) => ({ kind, body }))).toEqual([
      { kind: 'decision', body: 'Use SQLite.' },
      { kind: 'warning', body: 'Keep the database user-global.' },
      { kind: 'status', body: 'Database work is complete.' },
    ])
    expect(written.every((message) => message.roomId === active.room.id)).toBe(true)
    expect(written.every((message) => message.membershipId === active.membership.id)).toBe(true)
    expect(written.map((message) => message.id)).toEqual(
      written.map((message) => message.id).toSorted((left, right) => left - right),
    )
  })

  it('rejects writes without an active membership', async () => {
    const db = await createTestDatabase()

    await expect(
      writeMessages(db, {
        conversationId: 'missing',
        messages: [{ kind: 'status', body: 'message' }],
      }),
    ).rejects.toBeInstanceOf(ActiveMembershipNotFoundError)
  })

  it.each([
    [[], 'an empty batch'],
    [[{ kind: 'invalid', body: 'valid' }], 'an invalid kind'],
    [[{ kind: 'status', body: '   ' }], 'a blank body'],
    [
      [
        { kind: 'status', body: 'valid' },
        { kind: 'invalid', body: 'invalid' },
      ],
      'a partially valid batch',
    ],
  ])('rejects %s without writing any rows (%s)', async (messageInput) => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    await expect(
      writeMessages(db, {
        conversationId: 'conversation',
        messages: messageInput,
      } as WriteMessagesInput),
    ).rejects.toBeInstanceOf(InvalidMessagesError)
    await expect(db.select().from(messages)).resolves.toEqual([])
  })

  it('returns an empty batch for an active membership without messages', async () => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: expect.objectContaining({ name: 'build' }),
      messages: [],
    })
  })

  it('returns active-room messages in ascending order and advances the cursor', async () => {
    const db = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'active', conversationId: 'conversation' })
    const other = await createRoom(db, { roomName: 'other', conversationId: 'other-conversation' })
    const first = await addMessage(db, active.room.id, active.membership.id)
    await addMessage(db, other.room.id, other.membership.id)
    const last = await addMessage(db, active.room.id, active.membership.id)

    const consumed = await consumeNewMessages(db, { conversationId: 'conversation' })

    expect(consumed).toEqual({ room: active.room, messages: [first, last] })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: last.id }])
    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [],
    })
  })

  it('skips messages at or before the existing cursor', async () => {
    const db = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const first = await addMessage(db, active.room.id, active.membership.id)
    const second = await addMessage(db, active.room.id, active.membership.id)
    await db
      .update(memberships)
      .set({ cursor: first.id })
      .where(eq(memberships.id, active.membership.id))

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [second],
    })
  })

  it('includes messages authored by the consuming membership', async () => {
    const db = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const selfAuthored = await addMessage(db, active.room.id, active.membership.id)

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [selfAuthored],
    })
  })
})
