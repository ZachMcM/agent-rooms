import type { Principal } from '@agent-rooms/protocol'

import type { Database } from '../client'
import type { DecisionRow } from '../schema'

export type WriteDecisionArgs = {
  sessionId: string
  body: string
}

export function writeDecision(
  _db: Database,
  _principal: Principal,
  _args: WriteDecisionArgs,
): Promise<DecisionRow> {
  // TODO: resolve the membership from sessionId, then insert scoped to its room
  throw new Error('not implemented')
}

export function readDecisions(
  _db: Database,
  _principal: Principal,
  _roomId: string,
): Promise<DecisionRow[]> {
  // TODO: full dump of the room, owner-scoped through a join on rooms
  // TODO (deferred past MVP): optional semantic search over decision prose via libSQL
  // F32_BLOB + vector_distance_cos. Ranking composes with the same WHERE clauses.
  throw new Error('not implemented')
}

// Read-and-advance in one statement. Two hooks share this cursor, so a separate read then update
// lets concurrent hook processes on the same membership double-inject.
export function drainDecisions(
  _db: Database,
  _principal: Principal,
  _membershipId: string,
): Promise<DecisionRow[]> {
  // TODO: single UPDATE ... RETURNING (or immediate transaction) advancing memberships.cursor
  // to the max decisions.id in the room, returning the rows in between.
  throw new Error('not implemented')
}
