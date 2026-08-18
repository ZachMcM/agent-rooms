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
import type { ListedRoomMessages } from './messages'

export interface RoomOverviewMember {
  id: string
  conversationId: string
  status: MembershipStatus
}

export interface RoomOverview {
  room: RoomRow
  members: RoomOverviewMember[]
  lastActivityAt: Date
}

export interface GetRoomMembersInput {
  roomId: string
}

export interface GetRoomMessagesInput {
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

export interface RoomDetail extends RoomMembers {
  messages: ListedRoomMessages['messages']
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
  const roomResults = await db
    .select({
      room: rooms,
      lastActivityAt: sql<Date>`coalesce(max(${messages.createdAt}), ${rooms.createdAt})`.mapWith(
        rooms.createdAt,
      ),
    })
    .from(rooms)
    .leftJoin(messages, eq(messages.roomId, rooms.id))
    .groupBy(rooms.id)
    .orderBy(asc(sql`lower(${rooms.name})`), asc(rooms.name), asc(rooms.id))
  const roomIds = roomResults.map(({ room }) => room.id)
  const memberResults =
    roomIds.length === 0
      ? []
      : await db
          .select({
            id: memberships.id,
            roomId: memberships.roomId,
            conversationId: memberships.conversationId,
            status: memberships.status,
          })
          .from(memberships)
          .where(inArray(memberships.roomId, roomIds))
          .orderBy(asc(memberships.id))
  const membersByRoomId = new Map<string, RoomOverviewMember[]>()

  for (const { roomId, ...member } of memberResults) {
    const roomMembers = membersByRoomId.get(roomId) ?? []
    roomMembers.push(member)
    membersByRoomId.set(roomId, roomMembers)
  }

  return roomResults.map(({ room, lastActivityAt }) => ({
    room,
    members: membersByRoomId.get(room.id) ?? [],
    lastActivityAt,
  }))
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

export async function getRoomMessages(
  db: Database,
  input: GetRoomMessagesInput,
): Promise<ListedRoomMessages | undefined> {
  const roomResult = await db.query.rooms.findFirst({
    where: { id: input.roomId },
    with: {
      messages: {
        orderBy: { id: 'asc' },
        with: {
          membership: {
            columns: {
              id: true,
              conversationId: true,
              status: true,
            },
          },
          replyTo: {
            columns: {
              id: true,
              kind: true,
              body: true,
            },
            with: {
              membership: {
                columns: {
                  id: true,
                  conversationId: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!roomResult) {
    return undefined
  }

  const { messages: roomMessages, ...room } = roomResult

  return { room, messages: roomMessages }
}

export async function getRoomDetail(
  db: Database,
  input: GetRoomMembersInput,
): Promise<RoomDetail | undefined> {
  const [roomMembers, roomMessages] = await Promise.all([
    getRoomMembers(db, input),
    getRoomMessages(db, input),
  ])
  if (!roomMembers || !roomMessages) return undefined
  return { ...roomMembers, messages: roomMessages.messages }
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
