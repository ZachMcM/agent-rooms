import { asc, eq, inArray, sql } from 'drizzle-orm'

import type { Database } from '../client'
import {
  memberships,
  messages,
  rooms,
  type MembershipStatus,
  type MessageKind,
  type RoomRow,
} from '../schema'

export interface RoomOverviewMember {
  id: string
  conversationId: string
  status: MembershipStatus
}

export interface RoomOverview {
  room: RoomRow
  members: RoomOverviewMember[]
}

export interface GetRoomMembersInput {
  roomId: string
}

export interface DashboardMessageCounts {
  total: number
  decision: number
  warning: number
  question: number
  answer: number
  status: number
}

export interface DashboardRecentMessage {
  id: number
  kind: MessageKind
  body: string
  createdAt: Date
}

export interface DashboardRoomMember {
  id: string
  conversationId: string
  status: MembershipStatus
  joinedAt: Date
  cursor: number
  messageCounts: DashboardMessageCounts
  mostRecentMessage: DashboardRecentMessage | null
}

export interface RoomMembers {
  room: RoomRow
  members: DashboardRoomMember[]
}

export interface SearchRoomsAndMessagesInput {
  query: string
  roomId?: string
  limit?: number
}

export interface DashboardMessageSearchHit {
  room: Pick<RoomRow, 'id' | 'name'>
  member: {
    id: string
    conversationId: string
  }
  message: {
    id: number
    kind: MessageKind
    body: string
    createdAt: Date
  }
}

export interface DashboardSearchResults {
  rooms: RoomRow[]
  messages: DashboardMessageSearchHit[]
}

export class InvalidSearchLimitError extends Error {
  constructor() {
    super('Search limit must be an integer between 1 and 50')
    this.name = 'InvalidSearchLimitError'
  }
}

export async function listRoomOverviews(db: Database): Promise<RoomOverview[]> {
  const roomResults = await db.query.rooms.findMany({
    orderBy: (room, { asc }) => [asc(sql`lower(${room.name})`), asc(room.name), asc(room.id)],
    with: {
      memberships: {
        columns: {
          id: true,
          conversationId: true,
          status: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  return roomResults.map(({ memberships: members, ...room }) => ({ room, members }))
}

export async function getRoomMembers(
  db: Database,
  input: GetRoomMembersInput,
): Promise<RoomMembers | undefined> {
  const rows = await db
    .select({
      room: rooms,
      member: {
        id: memberships.id,
        conversationId: memberships.conversationId,
        status: memberships.status,
        joinedAt: memberships.createdAt,
        cursor: memberships.cursor,
      },
      total: sql<number>`count(${messages.id})`,
      decision: sql<number>`sum(case when ${messages.kind} = 'decision' then 1 else 0 end)`,
      warning: sql<number>`sum(case when ${messages.kind} = 'warning' then 1 else 0 end)`,
      question: sql<number>`sum(case when ${messages.kind} = 'question' then 1 else 0 end)`,
      answer: sql<number>`sum(case when ${messages.kind} = 'answer' then 1 else 0 end)`,
      status: sql<number>`sum(case when ${messages.kind} = 'status' then 1 else 0 end)`,
      mostRecentMessageId: sql<number | null>`max(${messages.id})`,
    })
    .from(rooms)
    .leftJoin(memberships, eq(memberships.roomId, rooms.id))
    .leftJoin(messages, eq(messages.membershipId, memberships.id))
    .where(eq(rooms.id, input.roomId))
    .groupBy(rooms.id, memberships.id)
    .orderBy(asc(memberships.createdAt), asc(memberships.id))

  const first = rows[0]

  if (!first) {
    return undefined
  }

  const recentMessageIds = rows.flatMap((row) =>
    row.mostRecentMessageId === null ? [] : [row.mostRecentMessageId],
  )
  const recentMessages =
    recentMessageIds.length === 0
      ? []
      : await db
          .select({
            id: messages.id,
            kind: messages.kind,
            body: messages.body,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(inArray(messages.id, recentMessageIds))
  const recentMessagesById = new Map(recentMessages.map((message) => [message.id, message]))

  return {
    room: first.room,
    members: rows.flatMap((row) => {
      if (!row.member) {
        return []
      }

      return [
        {
          ...row.member,
          messageCounts: {
            total: Number(row.total),
            decision: Number(row.decision),
            warning: Number(row.warning),
            question: Number(row.question),
            answer: Number(row.answer),
            status: Number(row.status),
          },
          mostRecentMessage:
            row.mostRecentMessageId === null
              ? null
              : (recentMessagesById.get(row.mostRecentMessageId) ?? null),
        },
      ]
    }),
  }
}

export async function searchRoomsAndMessages(
  db: Database,
  input: SearchRoomsAndMessagesInput,
): Promise<DashboardSearchResults> {
  const limit = input.limit ?? 20

  if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
    throw new InvalidSearchLimitError()
  }

  const query = input.query.trim()

  if (!query) {
    return { rooms: [], messages: [] }
  }

  const roomResults = await db
    .select()
    .from(rooms)
    .where(sql`instr(lower(${rooms.name}), lower(${query})) > 0`)
    .orderBy(asc(sql`lower(${rooms.name})`), asc(rooms.name), asc(rooms.id))
    .limit(limit)

  const messageResults = await db.query.messages.findMany({
    columns: {
      id: true,
      kind: true,
      body: true,
      createdAt: true,
    },
    where: {
      roomId: input.roomId,
      RAW: (message) => sql`instr(lower(${message.body}), lower(${query})) > 0`,
    },
    orderBy: { id: 'desc' },
    limit,
    with: {
      room: {
        columns: {
          id: true,
          name: true,
        },
      },
      membership: {
        columns: {
          id: true,
          conversationId: true,
        },
      },
    },
  })

  return {
    rooms: roomResults,
    messages: messageResults.map((result) => ({
      room: result.room,
      member: {
        id: result.membership.id,
        conversationId: result.membership.conversationId,
      },
      message: {
        id: result.id,
        kind: result.kind,
        body: result.body,
        createdAt: result.createdAt,
      },
    })),
  }
}
