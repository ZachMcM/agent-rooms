import { createMiddleware } from 'hono/factory'

import type { AppBindings } from '../types'

// Mounted only in the cloud composition — absent, not disabled, in local.
export function rateLimit() {
  return createMiddleware<AppBindings>(async (_c, next) => {
    // TODO (cloud): per-principal rate limiting
    await next()
  })
}
