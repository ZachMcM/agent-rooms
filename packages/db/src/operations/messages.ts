import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import type { Database } from '../client'
import {
  memberships,
  messages,
  NON_ANSWER_MESSAGE_KINDS,
  type MessageKind,
  type MessageRow,
  type MembershipRow,
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
const replyTargetColumns = { id: true, kind: true, body: true } as const
const messageMembershipColumns = { id: true, conversationId: true, status: true } as const

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

export interface ReplyTarget {
  id: number
  kind: MessageKind
  body: string
}

export type RoomMessage = MessageRow & { replyTo: ReplyTarget | null }

export type MessageMembership = Pick<MembershipRow, 'id' | 'conversationId' | 'status'>

export type ListedReplyTarget = ReplyTarget & { membership: MessageMembership }

export type ListedRoomMessage = MessageRow & {
  membership: MessageMembership
  replyTo: ListedReplyTarget | null
}

export interface RoomMessages {
  room: RoomRow
  messages: RoomMessage[]
}

export interface ListedRoomMessages {
  room: RoomRow
  messages: ListedRoomMessage[]
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
  return db.transaction(
    async (tx) => {
      const activeMembership = await findActiveRoomMembership(tx, input.conversationId)

      if (!activeMembership) {
        return undefined
      }

      const newMessages = await tx.query.messages.findMany({
        where: {
          roomId: activeMembership.membership.roomId,
          id: { gt: activeMembership.membership.cursor },
        },
        orderBy: { id: 'asc' },
        with: {
          replyTo: {
            columns: replyTargetColumns,
          },
        },
      })

      const lastMessage = newMessages.at(-1)

      if (!lastMessage) {
        return { room: activeMembership.room, messages: [] }
      }

      await tx
        .update(memberships)
        .set({ cursor: lastMessage.id })
        .where(eq(memberships.id, activeMembership.membership.id))

      return { room: activeMembership.room, messages: newMessages }
    },
    { behavior: 'immediate' },
  )
}

export async function listRoomMessages(
  db: Database,
  input: ListRoomMessagesInput,
): Promise<ListedRoomMessages | undefined> {
  const activeMembership = await db.query.memberships.findFirst({
    where: {
      conversationId: input.conversationId,
      status: 'active',
    },
    with: {
      room: {
        with: {
          messages: {
            orderBy: { id: 'asc' },
            with: {
              membership: {
                columns: messageMembershipColumns,
              },
              replyTo: {
                columns: replyTargetColumns,
                with: {
                  membership: {
                    columns: messageMembershipColumns,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!activeMembership) {
    return undefined
  }

  const { messages: roomMessages, ...room } = activeMembership.room

  return { room, messages: roomMessages }
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

    const questionIds = [
      ...new Set(
        parsedMessages.data.flatMap((message) =>
          message.kind === 'answer' ? [message.replyToMessageId] : [],
        ),
      ),
    ]

    if (questionIds.length > 0) {
      const replyTargets = await tx
        .select({ id: messages.id, roomId: messages.roomId, kind: messages.kind })
        .from(messages)
        .where(inArray(messages.id, questionIds))
      const validReplyTargetIds = new Set(
        replyTargets
          .filter(
            (message) =>
              message.roomId === activeMembership.membership.roomId && message.kind === 'question',
          )
          .map((message) => message.id),
      )

      if (questionIds.some((id) => !validReplyTargetIds.has(id))) {
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
