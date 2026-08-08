import type { JoinRoomInput, JoinRoomOutput } from '@agent-comms/protocol'

import type { ToolHandler } from '../context'

export const joinRoom: ToolHandler<JoinRoomInput, JoinRoomOutput> = async (_ctx, _params) => {
  // TODO: call joinRoom from @agent-comms/db with ctx.principal
  throw new Error('not implemented')
}
