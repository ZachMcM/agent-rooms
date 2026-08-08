import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    // Ownership is the right shape for both plausible futures: a room_members join table for
    // cross-user sharing sits on top of it additively, and orgs, if they ever arrive, group above.
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
    agentLabel: text('agent_label').notNull(),
    // Monotonic high-water mark over decisions.id. Read-and-advance must be atomic or concurrent
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

export const decisions = sqliteTable(
  'decisions',
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
    // Denormalised so a decision stays readable after its author's membership is gone.
    agentLabel: text('agent_label').notNull(),
    body: text('body').notNull(),
    // TODO: add an F32_BLOB(n) embedding column once an embedding provider is chosen. The
    // dimension is fixed at schema time, so changing models later is a migration.
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('decisions_room_id_idx').on(table.roomId, table.id)],
)

export type RoomRow = typeof rooms.$inferSelect
export type NewRoomRow = typeof rooms.$inferInsert
export type MembershipRow = typeof memberships.$inferSelect
export type NewMembershipRow = typeof memberships.$inferInsert
export type DecisionRow = typeof decisions.$inferSelect
export type NewDecisionRow = typeof decisions.$inferInsert
