import { defineRelations } from 'drizzle-orm'

import * as schema from './schema'

// The Better Auth generator emits these three with the legacy `relations()` helper. Restated here
// through defineRelations so the repo keeps one relations API — the adapter does not read them,
// it drives the query builder directly, so they exist purely for our own typed joins.
export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
      optional: false,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
      optional: false,
    }),
  },
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
