import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../client'
import { runMigrations } from '../migrator'
import { memberships, rooms } from '../schema'
import {
  ActiveMembershipConflictError,
  createRoom,
  joinRoom,
  MembershipConflictError,
  MembershipNotFoundError,
  leaveRoom,
  listRooms,
  RoomNameConflictError,
  RoomNotFoundError,
} from './rooms'

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

describe('room operations', () => {
  it('creates a room and persists its creator membership', async () => {
    const db = await createTestDatabase()

    const result = await createRoom(db, { roomName: 'build', conversationId: 'creator' })

    expect(result.room.name).toBe('build')
    expect(result.membership).toMatchObject({
      roomId: result.room.id,
      conversationId: 'creator',
      cursor: 0,
      status: 'active',
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, result.membership.id)),
    ).resolves.toEqual([result.membership])
  })

  it('joins an existing room by its exact name', async () => {
    const db = await createTestDatabase()
    const created = await createRoom(db, { roomName: 'Build', conversationId: 'creator' })

    const joined = await joinRoom(db, { roomName: 'Build', conversationId: 'guest' })

    expect(joined.room).toEqual(created.room)
    expect(joined.membership).toMatchObject({
      roomId: created.room.id,
      conversationId: 'guest',
      status: 'active',
    })
    await expect(
      joinRoom(db, { roomName: 'build', conversationId: 'other' }),
    ).rejects.toBeInstanceOf(RoomNotFoundError)
  })

  it('returns typed conflicts for duplicate room names and memberships', async () => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'creator' })

    await expect(
      createRoom(db, { roomName: 'build', conversationId: 'other' }),
    ).rejects.toBeInstanceOf(RoomNameConflictError)
    await expect(
      joinRoom(db, { roomName: 'build', conversationId: 'creator' }),
    ).rejects.toBeInstanceOf(MembershipConflictError)
  })

  it('rolls back a new room when its creator has an active membership elsewhere', async () => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'existing', conversationId: 'conversation' })

    await expect(
      createRoom(db, { roomName: 'rolled-back', conversationId: 'conversation' }),
    ).rejects.toBeInstanceOf(ActiveMembershipConflictError)
    await expect(db.select().from(rooms).where(eq(rooms.name, 'rolled-back'))).resolves.toEqual([])
  })

  it('rejects joining another room while the conversation has an active membership', async () => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'first', conversationId: 'conversation' })
    await createRoom(db, { roomName: 'second', conversationId: 'other' })

    await expect(
      joinRoom(db, { roomName: 'second', conversationId: 'conversation' }),
    ).rejects.toBeInstanceOf(ActiveMembershipConflictError)
  })

  it('enforces one active membership directly while allowing inactive memberships', async () => {
    const db = await createTestDatabase()
    const first = await createRoom(db, { roomName: 'first', conversationId: 'first-owner' })
    const second = await createRoom(db, { roomName: 'second', conversationId: 'second-owner' })
    const third = await createRoom(db, { roomName: 'third', conversationId: 'third-owner' })

    await db
      .insert(memberships)
      .values({ id: 'active-membership', roomId: first.room.id, conversationId: 'conversation' })
    await expect(
      db.insert(memberships).values({
        id: 'duplicate-active-membership',
        roomId: second.room.id,
        conversationId: 'conversation',
      }),
    ).rejects.toThrow()
    await expect(
      db.insert(memberships).values({
        id: 'inactive-membership',
        roomId: third.room.id,
        conversationId: 'conversation',
        status: 'inactive',
      }),
    ).resolves.toBeDefined()
  })

  it('leaves an active membership and keeps it inactive', async () => {
    const db = await createTestDatabase()
    const created = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    const left = await leaveRoom(db, { roomName: 'build', conversationId: 'conversation' })

    expect(left).toMatchObject({
      room: created.room,
      membership: { id: created.membership.id, status: 'inactive' },
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, created.membership.id)),
    ).resolves.toEqual([left.membership])
    await expect(listRooms(db, { conversationId: 'conversation' })).resolves.toEqual([])
  })

  it('returns typed errors when leaving a missing room or inactive membership', async () => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'member' })

    await expect(
      leaveRoom(db, { roomName: 'missing', conversationId: 'member' }),
    ).rejects.toBeInstanceOf(RoomNotFoundError)
    await expect(
      leaveRoom(db, { roomName: 'build', conversationId: 'non-member' }),
    ).rejects.toBeInstanceOf(MembershipNotFoundError)
    await leaveRoom(db, { roomName: 'build', conversationId: 'member' })
    await expect(
      leaveRoom(db, { roomName: 'build', conversationId: 'member' }),
    ).rejects.toBeInstanceOf(MembershipNotFoundError)
  })

  it('reactivates an inactive membership without changing its identity', async () => {
    const db = await createTestDatabase()
    const created = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    await leaveRoom(db, { roomName: 'build', conversationId: 'conversation' })

    const rejoined = await joinRoom(db, { roomName: 'build', conversationId: 'conversation' })

    expect(rejoined).toMatchObject({
      room: created.room,
      membership: {
        id: created.membership.id,
        cursor: created.membership.cursor,
        conversationId: created.membership.conversationId,
        status: 'active',
      },
    })
    await expect(listRooms(db, { conversationId: 'conversation' })).resolves.toEqual([rejoined])
  })

  it('allows joining another room after leaving the active membership', async () => {
    const db = await createTestDatabase()
    await createRoom(db, { roomName: 'first', conversationId: 'conversation' })
    await createRoom(db, { roomName: 'second', conversationId: 'other' })
    await leaveRoom(db, { roomName: 'first', conversationId: 'conversation' })

    const joined = await joinRoom(db, { roomName: 'second', conversationId: 'conversation' })

    expect(joined).toMatchObject({ room: { name: 'second' }, membership: { status: 'active' } })
    await expect(listRooms(db, { conversationId: 'conversation' })).resolves.toEqual([joined])
  })

  it('does not leave a room behind when membership creation fails', async () => {
    const db = await createTestDatabase()
    await db.run(
      "CREATE TRIGGER reject_membership BEFORE INSERT ON memberships WHEN NEW.conversation_id = 'blocked' BEGIN SELECT RAISE(ABORT, 'membership blocked'); END",
    )

    await expect(createRoom(db, { roomName: 'build', conversationId: 'blocked' })).rejects.toThrow()
    await expect(db.select().from(rooms).where(eq(rooms.name, 'build'))).resolves.toEqual([])
  })
})
