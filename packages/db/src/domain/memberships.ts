import type { Principal } from '@agent-rooms/protocol'

import type { Database } from '../client'
import type { MembershipRow } from '../schema'

export type JoinRoomArgs = {
  roomName: string
  conversationId: string
}

export function joinRoom(
  _db: Database,
  _principal: Principal,
  _args: JoinRoomArgs,
): Promise<MembershipRow> {
  // TODO: ensure the room exists, then upsert the membership on (room_id, conversation_id)
  throw new Error('not implemented')
}

export function findMembershipByConversation(
  _db: Database,
  _principal: Principal,
  _conversationId: string,
): Promise<MembershipRow | undefined> {
  // TODO: resolve the membership both injection hooks use to find the room and cursor
  throw new Error('not implemented')
}
