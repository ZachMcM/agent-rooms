import type { MessageKind, Principal } from '@agent-rooms/protocol'

import type { Database } from '../client'
import type { MessageRow } from '../schema'

export type WriteMessageArgs = {
  sessionId: string
  kind: MessageKind
  body: string
}

export type ReadMessagesArgs = {
  roomId: string
  kind?: MessageKind
  query?: string
}

export function writeMessage(
  _db: Database,
  _principal: Principal,
  _args: WriteMessageArgs,
): Promise<MessageRow> {
  // TODO: resolve the membership from sessionId, then insert scoped to its room
  throw new Error('not implemented')
}

// The pull path. It must never advance the cursor: an agent that reads while planning would
// otherwise consume its own future injections and never be told again.
export function readMessages(
  _db: Database,
  _principal: Principal,
  _args: ReadMessagesArgs,
): Promise<MessageRow[]> {
  // TODO: full dump of the room, owner-scoped through a join on rooms, with an FTS5 match when
  // `query` is present and a dump budget so an unbounded room truncates visibly.
  throw new Error('not implemented')
}

// Read-and-advance in one statement. Two hooks share this cursor, so a separate read then update
// lets concurrent hook processes on the same membership double-inject.
export function drainMessages(
  _db: Database,
  _principal: Principal,
  _membershipId: string,
): Promise<MessageRow[]> {
  // TODO: single UPDATE ... RETURNING (or immediate transaction) advancing memberships.cursor
  // to the max messages.id in the room, returning the INJECTED_MESSAGE_KINDS rows in between.
  throw new Error('not implemented')
}
