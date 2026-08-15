import { randomUUID } from 'node:crypto'

import { and, asc, eq } from 'drizzle-orm'

import type { Database } from '../client'
import { memberships, rooms, type MembershipRow, type RoomRow } from '../schema'

export interface RoomInput {
  roomName: string
  conversationId: string
}

export interface RoomMembership {
  room: RoomRow
  membership: MembershipRow
}

export interface ListRoomsInput {
  conversationId: string
}

export class RoomNotFoundError extends Error {
  constructor(roomName: string) {
    super(`Room not found: ${roomName}`)
    this.name = 'RoomNotFoundError'
  }
}

export class RoomNameConflictError extends Error {
  constructor(roomName: string) {
    super(`Room name already exists: ${roomName}`)
    this.name = 'RoomNameConflictError'
  }
}

export class MembershipConflictError extends Error {
  constructor(roomName: string, conversationId: string) {
    super(`Conversation ${conversationId} is already a member of room: ${roomName}`)
    this.name = 'MembershipConflictError'
  }
}

export class ActiveMembershipConflictError extends Error {
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} is already an active member of another room`)
    this.name = 'ActiveMembershipConflictError'
  }
}

export class MembershipNotFoundError extends Error {
  constructor(roomName: string, conversationId: string) {
    super(`Conversation ${conversationId} is not an active member of room: ${roomName}`)
    this.name = 'MembershipNotFoundError'
  }
}

export async function createRoom(db: Database, input: RoomInput): Promise<RoomMembership> {
  try {
    return await db.transaction(async (tx) => {
      const existingRoom = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.name, input.roomName))
        .limit(1)

      if (existingRoom.length > 0) {
        throw new RoomNameConflictError(input.roomName)
      }

      const [room] = await tx
        .insert(rooms)
        .values({ id: randomUUID(), name: input.roomName })
        .returning()

      if (!room) {
        throw new Error('Room creation did not return an inserted record')
      }

      const [membership] = await tx
        .insert(memberships)
        .values({ id: randomUUID(), roomId: room.id, conversationId: input.conversationId })
        .returning()

      if (!membership) {
        throw new Error('Room membership creation did not return an inserted record')
      }

      return { room, membership }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingRoom = await findRoomByName(db, input.roomName)

      if (existingRoom) {
        throw new RoomNameConflictError(input.roomName)
      }

      if (
        (await findActiveMembership(db, input.conversationId)) ||
        isActiveMembershipConstraintError(error)
      ) {
        throw new ActiveMembershipConflictError(input.conversationId)
      }

      throw new RoomNameConflictError(input.roomName)
    }

    throw error
  }
}

export async function joinRoom(db: Database, input: RoomInput): Promise<RoomMembership> {
  try {
    return await db.transaction(async (tx) => {
      const [room] = await tx.select().from(rooms).where(eq(rooms.name, input.roomName)).limit(1)

      if (!room) {
        throw new RoomNotFoundError(input.roomName)
      }

      const [reactivatedMembership] = await tx
        .update(memberships)
        .set({ status: 'active' })
        .where(
          and(
            eq(memberships.roomId, room.id),
            eq(memberships.conversationId, input.conversationId),
            eq(memberships.status, 'inactive'),
          ),
        )
        .returning()

      if (reactivatedMembership) {
        return { room, membership: reactivatedMembership }
      }

      const [membership] = await tx
        .insert(memberships)
        .values({ id: randomUUID(), roomId: room.id, conversationId: input.conversationId })
        .returning()

      if (!membership) {
        throw new Error('Room membership creation did not return an inserted record')
      }

      return { room, membership }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const activeMembership = await findActiveMembership(db, input.conversationId)

      if (activeMembership?.room.name === input.roomName) {
        throw new MembershipConflictError(input.roomName, input.conversationId)
      }

      if (activeMembership || isActiveMembershipConstraintError(error)) {
        throw new ActiveMembershipConflictError(input.conversationId)
      }

      throw new MembershipConflictError(input.roomName, input.conversationId)
    }

    throw error
  }
}

async function findRoomByName(db: Database, roomName: string): Promise<RoomRow | undefined> {
  const [room] = await db.select().from(rooms).where(eq(rooms.name, roomName)).limit(1)
  return room
}

async function findActiveMembership(
  db: Database,
  conversationId: string,
): Promise<RoomMembership | undefined> {
  const [membership] = await db
    .select({ room: rooms, membership: memberships })
    .from(memberships)
    .innerJoin(rooms, eq(memberships.roomId, rooms.id))
    .where(and(eq(memberships.conversationId, conversationId), eq(memberships.status, 'active')))
    .limit(1)

  return membership
}

export async function listRooms(db: Database, input: ListRoomsInput): Promise<RoomMembership[]> {
  return db
    .select({ room: rooms, membership: memberships })
    .from(memberships)
    .innerJoin(rooms, eq(memberships.roomId, rooms.id))
    .where(
      and(eq(memberships.conversationId, input.conversationId), eq(memberships.status, 'active')),
    )
    .orderBy(asc(rooms.name))
}

export async function leaveRoom(db: Database, input: RoomInput): Promise<RoomMembership> {
  const [room] = await db.select().from(rooms).where(eq(rooms.name, input.roomName)).limit(1)

  if (!room) {
    throw new RoomNotFoundError(input.roomName)
  }

  const [membership] = await db
    .update(memberships)
    .set({ status: 'inactive' })
    .where(
      and(
        eq(memberships.roomId, room.id),
        eq(memberships.conversationId, input.conversationId),
        eq(memberships.status, 'active'),
      ),
    )
    .returning()

  if (!membership) {
    throw new MembershipNotFoundError(input.roomName, input.conversationId)
  }

  return { room, membership }
}

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Error && /unique constraint|sqlite_constraint_unique/i.test(error.message)) {
    return true
  }

  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return isUniqueConstraintError(error.cause)
  }

  return false
}

function isActiveMembershipConstraintError(error: unknown): boolean {
  if (
    error instanceof Error &&
    /memberships(?:\.conversation_id|_conversation_active_unique)/i.test(error.message)
  ) {
    return true
  }

  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return isActiveMembershipConstraintError(error.cause)
  }

  return false
}
