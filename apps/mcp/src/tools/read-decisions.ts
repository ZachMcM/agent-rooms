import type { ReadDecisionsInput, ReadDecisionsOutput } from '@agent-rooms/protocol'

import type { ToolHandler } from '../context'

export const readDecisions: ToolHandler<ReadDecisionsInput, ReadDecisionsOutput> = async (
  _ctx,
  _params,
) => {
  // TODO: full dump of the room by default. `query` is the explicit pull path where precision is
  // the right objective — injection stays cursor-based and is never semantic.
  throw new Error('not implemented')
}
