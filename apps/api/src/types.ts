import type { Database } from '@agent-comms/db'
import type { Principal } from '@agent-comms/protocol'

export type AppBindings = {
  Variables: {
    principal: Principal
  }
}

type BaseOptions = {
  db: Database
  version: string
}

// Mode is resolved once at startup, not per request. Routes never branch on it.
export type CreateAppOptions =
  | (BaseOptions & { mode: 'local'; principal: Principal })
  | (BaseOptions & { mode: 'cloud' })
