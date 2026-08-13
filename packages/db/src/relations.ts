import { defineRelations } from 'drizzle-orm'

import * as schema from './schema'

export const relations = defineRelations(schema, (r) => ({
  rooms: {
    memberships: r.many.memberships(),
    messages: r.many.messages(),
  },
  memberships: {
    room: r.one.rooms({
      from: r.memberships.roomId,
      to: r.rooms.id,
      optional: false,
    }),
    messages: r.many.messages(),
  },
  messages: {
    room: r.one.rooms({
      from: r.messages.roomId,
      to: r.rooms.id,
      optional: false,
    }),
    membership: r.one.memberships({
      from: r.messages.membershipId,
      to: r.memberships.id,
      optional: false,
    }),
  },
}))
