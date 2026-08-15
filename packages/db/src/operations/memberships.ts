import { and, eq } from 'drizzle-orm'

import type { Database } from '../client'
import { memberships, rooms, type MembershipRow, type RoomRow } from '../schema'

export interface RoomMembership {
  room: RoomRow
  membership: MembershipRow
}

export async function findActiveRoomMembership(
  db: Database,
  conversationId: string,
): Promise<RoomMembership | undefined> {
  const [membership] = await db
    .select({ room: rooms, membership: memberships })
    .from(memberships)
    .innerJoin(rooms, eq(memberships.roomId, rooms.id))
    .where(and(eq(memberships.conversationId, conversationId), eq(memberships.status, 'active')))
    .limit(1)

  return membership
}
