import { randomUUID } from 'node:crypto'

import { and, asc, eq } from 'drizzle-orm'

import type { Database } from '../client'
import { membershipLifecycleEvents, memberships, rooms, type RoomRow } from '../schema'
import { findActiveRoomMembership, type RoomMembership } from './memberships'

export type { RoomMembership } from './memberships'

export interface RoomInput {
  roomName: string
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

      await tx
        .insert(membershipLifecycleEvents)
        .values({ membershipId: membership.id, kind: 'join' })

      return { room, membership }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const [existingRoom] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.name, input.roomName))
        .limit(1)

      if (
        !existingRoom &&
        ((await findActiveRoomMembership(db, input.conversationId)) ||
          isActiveMembershipConstraintError(error))
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
        await tx
          .insert(membershipLifecycleEvents)
          .values({ membershipId: reactivatedMembership.id, kind: 'join' })
        return { room, membership: reactivatedMembership }
      }

      const [membership] = await tx
        .insert(memberships)
        .values({ id: randomUUID(), roomId: room.id, conversationId: input.conversationId })
        .returning()

      if (!membership) {
        throw new Error('Room membership creation did not return an inserted record')
      }

      await tx
        .insert(membershipLifecycleEvents)
        .values({ membershipId: membership.id, kind: 'join' })

      return { room, membership }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const activeMembership = await findActiveRoomMembership(db, input.conversationId)

      if (
        (activeMembership && activeMembership.room.name !== input.roomName) ||
        (!activeMembership && isActiveMembershipConstraintError(error))
      ) {
        throw new ActiveMembershipConflictError(input.conversationId)
      }

      throw new MembershipConflictError(input.roomName, input.conversationId)
    }

    throw error
  }
}

export async function listActiveRooms(db: Database): Promise<RoomRow[]> {
  return db
    .selectDistinct({ id: rooms.id, name: rooms.name, createdAt: rooms.createdAt })
    .from(rooms)
    .innerJoin(memberships, eq(memberships.roomId, rooms.id))
    .where(eq(memberships.status, 'active'))
    .orderBy(asc(rooms.name))
}

export async function leaveRoom(db: Database, input: RoomInput): Promise<RoomMembership> {
  return db.transaction(async (tx) => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.name, input.roomName)).limit(1)

    if (!room) {
      throw new RoomNotFoundError(input.roomName)
    }

    const [membership] = await tx
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

    await tx
      .insert(membershipLifecycleEvents)
      .values({ membershipId: membership.id, kind: 'leave' })

    return { room, membership }
  })
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
