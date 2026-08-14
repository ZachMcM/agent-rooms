import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import type { Database } from './client'
import { memberships, rooms, type MembershipRow, type RoomRow } from './schema'

export interface RoomInput {
  roomName: string
  conversationId: string
}

export interface RoomMembership {
  room: RoomRow
  membership: MembershipRow
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
      throw new RoomNameConflictError(input.roomName)
    }

    throw error
  }
}

export async function joinRoom(db: Database, input: RoomInput): Promise<RoomMembership> {
  const [room] = await db.select().from(rooms).where(eq(rooms.name, input.roomName)).limit(1)

  if (!room) {
    throw new RoomNotFoundError(input.roomName)
  }

  try {
    const [membership] = await db
      .insert(memberships)
      .values({ id: randomUUID(), roomId: room.id, conversationId: input.conversationId })
      .returning()

    if (!membership) {
      throw new Error('Room membership creation did not return an inserted record')
    }

    return { room, membership }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new MembershipConflictError(input.roomName, input.conversationId)
    }

    throw error
  }
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
