import type { WriteDecisionInput, WriteDecisionOutput } from '@agent-comms/protocol'

import type { ToolHandler } from '../context'

export const writeDecision: ToolHandler<WriteDecisionInput, WriteDecisionOutput> = async (
  _ctx,
  _params,
) => {
  // TODO: resolve the membership from params.sessionId, then insert the decision
  throw new Error('not implemented')
}
