import type { Database } from '@agent-rooms/db'
import type { Principal } from '@agent-rooms/protocol'

// Never module-level session state. Under stdio one process is one session, which makes stashing
// session_id in a module variable tempting — under HTTP one process holds many sessions and that
// variable is a cross-user leak. Handlers are (ctx, params) => ... so the stdio → HTTP move is
// swapping the transport plus a credential check.
export type McpContext = {
  principal: Principal
  db: Database
}

export type ToolHandler<TParams, TResult> = (ctx: McpContext, params: TParams) => Promise<TResult>
