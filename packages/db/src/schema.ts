import type { MessageKind } from '@agent-rooms/protocol'
import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'


export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
})

// Not to be confused with memberships.sessionId: that is a Claude Code session, this is a browser
// login. Nothing joins the two — an agent authenticates as its user, never as a browser session.
export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerUserId: text('owner_user_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex('rooms_owner_name_unique').on(table.ownerUserId, table.name)],
)

export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    // Durable identity, supplied by the PreToolUse hook. Survives /resume; /clear starts a new one.
    sessionId: text('session_id').notNull(),
    // Monotonic high-water mark over messages.id. Read-and-advance must be atomic or concurrent
    // hook processes on the same membership double-inject.
    cursor: integer('cursor').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('memberships_room_session_unique').on(table.roomId, table.sessionId),
    index('memberships_session_idx').on(table.sessionId),
  ],
)

// Broad schema, narrow policy. The machinery here is a generic append-only log, so the table is
// not named after the one kind the skill currently writes — widening that is a prompt edit, where
// widening a table name is a migration.
export const messages = sqliteTable(
  'messages',
  {
    // AUTOINCREMENT, not plain rowid: the cursor depends on ids being monotonic and never reused.
    // SQLite assigns the id inside the write lock, so id order equals commit order.
    id: integer('id').primaryKey({ autoIncrement: true }),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    membershipId: text('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    // Enumerated at the protocol layer, plain text with no check constraint here, so a client
    // reading a kind added after it shipped degrades instead of throwing.
    kind: text('kind').$type<MessageKind>().notNull(),
    body: text('body').notNull(),
    // TODO: add an embedding column
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('messages_room_id_idx').on(table.roomId, table.id)],
)

export type UserRow = typeof user.$inferSelect
export type NewUserRow = typeof user.$inferInsert
export type SessionRow = typeof session.$inferSelect
export type NewSessionRow = typeof session.$inferInsert
export type AccountRow = typeof account.$inferSelect
export type NewAccountRow = typeof account.$inferInsert
export type VerificationRow = typeof verification.$inferSelect
export type NewVerificationRow = typeof verification.$inferInsert
export type RoomRow = typeof rooms.$inferSelect
export type NewRoomRow = typeof rooms.$inferInsert
export type MembershipRow = typeof memberships.$inferSelect
export type NewMembershipRow = typeof memberships.$inferInsert
export type MessageRow = typeof messages.$inferSelect
export type NewMessageRow = typeof messages.$inferInsert
