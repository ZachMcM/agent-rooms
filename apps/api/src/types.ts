import type { Database } from '@agent-rooms/db'
import type { Principal } from '@agent-rooms/protocol'

import type { Auth } from './auth'

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
//
// The two variants carry what each mode needs to produce a principal and nothing more: local has
// one fixed principal, cloud has the Better Auth instance that resolves a session into one.
export type CreateAppOptions =
  | (BaseOptions & { mode: 'local'; principal: Principal })
  | (BaseOptions & { mode: 'cloud'; auth: Auth })
