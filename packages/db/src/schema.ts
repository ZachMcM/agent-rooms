import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  type AnySQLiteColumn,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// Enumerated, not a free string: free labels fragment across agents (`api`, `API`, `api-contract`)
// and then cannot be filtered on.
export const MESSAGE_KINDS = ['decision', 'warning', 'question', 'answer', 'status'] as const

export type MessageKind = (typeof MESSAGE_KINDS)[number]

export const NON_ANSWER_MESSAGE_KINDS = MESSAGE_KINDS.filter((kind) => kind !== 'answer')

export const MEMBERSHIP_STATUSES = ['active', 'inactive'] as const

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number]

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex('rooms_name_unique').on(table.name)],
)

export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    // Derived from the harness and its native conversation id, so it survives /resume.
    conversationId: text('conversation_id').notNull(),
    // High-water mark over messages.id.
    cursor: integer('cursor').notNull().default(0),
    status: text('status').$type<MembershipStatus>().notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('memberships_room_conversation_unique').on(table.roomId, table.conversationId),
    uniqueIndex('memberships_conversation_active_unique')
      .on(table.conversationId)
      .where(sql`${table.status} = 'active'`),
    index('memberships_conversation_idx').on(table.conversationId),
  ],
)

export const messages = sqliteTable(
  'messages',
  {
    // AUTOINCREMENT, not plain rowid: the cursor depends on ids being monotonic and never reused.
    id: integer('id').primaryKey({ autoIncrement: true }),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    membershipId: text('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<MessageKind>().notNull(),
    body: text('body').notNull(),
    replyToMessageId: integer('reply_to_message_id').references(
      (): AnySQLiteColumn => messages.id,
      { onDelete: 'cascade' },
    ),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('messages_room_id_idx').on(table.roomId, table.id),
    index('messages_reply_to_message_id_idx').on(table.replyToMessageId),
  ],
)

export type RoomRow = typeof rooms.$inferSelect
export type NewRoomRow = typeof rooms.$inferInsert
export type MembershipRow = typeof memberships.$inferSelect
export type NewMembershipRow = typeof memberships.$inferInsert
export type MessageRow = typeof messages.$inferSelect
export type NewMessageRow = typeof messages.$inferInsert
