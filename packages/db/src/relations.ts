import { defineRelations } from 'drizzle-orm'

import * as schema from './schema'

export const relations = defineRelations(schema, (r) => ({
  rooms: {
    memberships: r.many.memberships(),
    decisions: r.many.decisions(),
  },
  memberships: {
    room: r.one.rooms({
      from: r.memberships.roomId,
      to: r.rooms.id,
      optional: false,
    }),
    decisions: r.many.decisions(),
  },
  decisions: {
    room: r.one.rooms({
      from: r.decisions.roomId,
      to: r.rooms.id,
      optional: false,
    }),
    membership: r.one.memberships({
      from: r.decisions.membershipId,
      to: r.memberships.id,
      optional: false,
    }),
  },
}))
