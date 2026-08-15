import { and, asc, eq, gt } from 'drizzle-orm'

import type { Database } from '../client'
import { memberships, messages, type MessageRow, type RoomRow } from '../schema'
import { findActiveRoomMembership } from './memberships'

export interface ConsumeNewMessagesInput {
  conversationId: string
}

export interface ListRoomMessagesInput {
  conversationId: string
}

export interface RoomMessages {
  room: RoomRow
  messages: MessageRow[]
}

export async function consumeNewMessages(
  db: Database,
  input: ConsumeNewMessagesInput,
): Promise<RoomMessages | undefined> {
  const activeMembership = await findActiveRoomMembership(db, input.conversationId)

  if (!activeMembership) {
    return undefined
  }

  const newMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.roomId, activeMembership.membership.roomId),
        gt(messages.id, activeMembership.membership.cursor),
      ),
    )
    .orderBy(asc(messages.id))

  const lastMessage = newMessages.at(-1)

  if (!lastMessage) {
    return { room: activeMembership.room, messages: [] }
  }

  await db
    .update(memberships)
    .set({ cursor: lastMessage.id })
    .where(eq(memberships.id, activeMembership.membership.id))

  return { room: activeMembership.room, messages: newMessages }
}

export async function listRoomMessages(
  db: Database,
  input: ListRoomMessagesInput,
): Promise<RoomMessages | undefined> {
  const activeMembership = await findActiveRoomMembership(db, input.conversationId)

  if (!activeMembership) {
    return undefined
  }

  const roomMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.roomId, activeMembership.membership.roomId))
    .orderBy(asc(messages.id))

  return { room: activeMembership.room, messages: roomMessages }
}
