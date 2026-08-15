import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../client'
import { runMigrations } from '../migrator'
import { memberships, messages } from '../schema'
import { consumeNewMessages } from './messages'
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
