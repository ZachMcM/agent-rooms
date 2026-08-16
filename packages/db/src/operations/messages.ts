import { and, asc, eq, gt, inArray } from 'drizzle-orm'
import { z } from 'zod'

import type { Database } from '../client'
import {
  memberships,
  messages,
  NON_ANSWER_MESSAGE_KINDS,
  type MessageRow,
  type RoomRow,
} from '../schema'
import { findActiveRoomMembership } from './memberships'

const bodySchema = z.string().refine((body) => Boolean(body.trim()))
const answerMessageSchema = z.strictObject({
  kind: z.literal('answer'),
  body: bodySchema,
  replyToMessageId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})
const nonAnswerMessageSchema = z.strictObject({
  kind: z.enum(NON_ANSWER_MESSAGE_KINDS),
  body: bodySchema,
})
const writeMessageSchema = z.discriminatedUnion('kind', [
  answerMessageSchema,
  nonAnswerMessageSchema,
])
const writeMessagesSchema = z.array(writeMessageSchema).min(1)

export interface ConsumeNewMessagesInput {
  conversationId: string
}

export interface ListRoomMessagesInput {
  conversationId: string
}

export type WriteMessageInput = z.infer<typeof writeMessageSchema>

export interface WriteMessagesInput {
  conversationId: string
  messages: WriteMessageInput[]
}

export interface RoomMessages {
  room: RoomRow
  messages: MessageRow[]
}

export class ActiveMembershipNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} does not have an active room membership`)
    this.name = 'ActiveMembershipNotFoundError'
  }
}

export class InvalidMessagesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidMessagesError'
  }
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

export async function writeMessages(
  db: Database,
  input: WriteMessagesInput,
): Promise<MessageRow[]> {
  const parsedMessages = writeMessagesSchema.safeParse(input.messages)

  if (!parsedMessages.success) {
    throw new InvalidMessagesError(
      'Messages must be valid and non-empty; answers require reply targets and other kinds must omit them',
    )
  }

  return db.transaction(async (tx) => {
    const activeMembership = await findActiveRoomMembership(tx, input.conversationId)

    if (!activeMembership) {
      throw new ActiveMembershipNotFoundError(input.conversationId)
    }

    const replyTargetIds = parsedMessages.data.flatMap((message) =>
      message.kind === 'answer' ? [message.replyToMessageId] : [],
    )

    if (replyTargetIds.length > 0) {
      const replyTargets = await tx
        .select({ id: messages.id, roomId: messages.roomId, kind: messages.kind })
        .from(messages)
        .where(inArray(messages.id, replyTargetIds))
      const validReplyTargetIds = new Set(
        replyTargets
          .filter(
            (message) =>
              message.roomId === activeMembership.membership.roomId && message.kind === 'question',
          )
          .map((message) => message.id),
      )

      if (replyTargetIds.some((id) => !validReplyTargetIds.has(id))) {
        throw new InvalidMessagesError('Answers must reply to question messages in the same room')
      }
    }

    return tx
      .insert(messages)
      .values(
        parsedMessages.data.map((message) => ({
          roomId: activeMembership.membership.roomId,
          membershipId: activeMembership.membership.id,
          kind: message.kind,
          body: message.body,
          replyToMessageId: message.kind === 'answer' ? message.replyToMessageId : null,
        })),
      )
      .returning()
  })
}
