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
    lifecycleEvents: r.many.membershipLifecycleEvents(),
  },
  membershipLifecycleEvents: {
    membership: r.one.memberships({
      from: r.membershipLifecycleEvents.membershipId,
      to: r.memberships.id,
      optional: false,
    }),
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
    replyTo: r.one.messages({
      from: r.messages.replyToMessageId,
      to: r.messages.id,
      optional: true,
      alias: 'reply',
    }),
    replies: r.many.messages({
      from: r.messages.id,
      to: r.messages.replyToMessageId,
      alias: 'reply',
    }),
  },
}))
