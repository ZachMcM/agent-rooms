import type { Principal } from '@agent-rooms/protocol'

import type { Database } from '../client'
import type { MembershipRow, RoomRow } from '../schema'

// Every domain function takes a principal first. Routes and mcp handlers never import the db
// client directly — an oxlint rule bans `@agent-rooms/db/client` outside this package — so
// scoping is structural rather than remembered.

export function listRooms(_db: Database, _principal: Principal): Promise<RoomRow[]> {
  // TODO: select rooms where rooms.owner_user_id = principal.userId
  throw new Error('not implemented')
}

export function getRoomByName(
  _db: Database,
  _principal: Principal,
  _name: string,
): Promise<RoomRow | undefined> {
  // TODO: select a single owned room by name
  throw new Error('not implemented')
}

export function ensureRoom(_db: Database, _principal: Principal, _name: string): Promise<RoomRow> {
  // TODO: upsert the owned room, returning the existing row when present
  throw new Error('not implemented')
}

export function listMemberships(
  _db: Database,
  _principal: Principal,
  _roomId: string,
): Promise<MembershipRow[]> {
  // TODO: join through rooms so the owner check applies
  throw new Error('not implemented')
}
