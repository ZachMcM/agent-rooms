import type { Principal } from '@agent-rooms/protocol'
import { createMiddleware } from 'hono/factory'

import type { AppBindings } from '../types'

// Two middleware satisfy the same contract — both set `principal` and nothing downstream knows
// which one ran. That makes the local/cloud difference authentication, not authorization.

export function localPrincipal(principal: Principal) {
  return createMiddleware<AppBindings>(async (c, next) => {
    c.set('principal', principal)
    await next()
  })
}

export const sessionPrincipal = createMiddleware<AppBindings>(async (_c, _next) => {
  // TODO (cloud): resolve a Better Auth session, 401 when absent, map session.user.id to userId.
  throw new Error('not implemented')
})
