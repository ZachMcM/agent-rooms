import type { ErrorResponse, Principal } from '@agent-rooms/protocol'
import { createMiddleware } from 'hono/factory'

import type { Auth } from '../auth'
import type { AppBindings } from '../types'

// Two middleware satisfy the same contract — both set `principal` and nothing downstream knows
// which one ran. That makes the local/cloud difference authentication, not authorization.

export function localPrincipal(principal: Principal) {
  return createMiddleware<AppBindings>(async (c, next) => {
    c.set('principal', principal)
    await next()
  })
}

export function sessionPrincipal(auth: Auth) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
      const body: ErrorResponse = {
        error: { code: 'unauthenticated', message: 'Sign in to continue.' },
      }
      return c.json(body, 401)
    }

    // Only the id crosses this line. Everything downstream is scoped by principal, and widening
    // it later is a compiler-guided change; leaking the whole session object is not.
    c.set('principal', { userId: session.user.id })
    await next()
  })
}
