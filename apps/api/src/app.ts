import { AUTH_BASE_PATH } from '@agent-rooms/protocol'
import { Hono } from 'hono'

import { localPrincipal, sessionPrincipal } from './middleware/principal'
import { rateLimit } from './middleware/rate-limit'
import { apiRoutes } from './routes'
import { staticRoutes } from './static'
import type { AppBindings, CreateAppOptions } from './types'

// Exports a factory rather than self-starting on import: the cli boots this in-process, cloud
// serves the same app from src/cloud.ts.
export function createApp(options: CreateAppOptions) {
  const app = new Hono<AppBindings>()

  if (options.mode === 'cloud') {
    // Registered before the auth routes so sign-in attempts are rate limited too.
    app.use('*', rateLimit())
    // Better Auth brings its own router and owns every path below AUTH_BASE_PATH. It gets the
    // raw Request, which keeps Hono out of the cookie and redirect handling where the security
    // properties actually live. It sits outside the principal middleware by definition — signing
    // in is what produces a principal.
    app.on(['GET', 'POST'], `${AUTH_BASE_PATH}/*`, (c) => options.auth.handler(c.req.raw))
  }

  app.route(
    '/api',
    apiRoutes({
      config: {
        mode: options.mode,
        version: options.version,
        // Local has one fixed principal and no login flow, so the SPA is handed it at boot.
        principal: options.mode === 'local' ? options.principal : null,
      },
      principal:
        options.mode === 'cloud'
          ? sessionPrincipal(options.auth)
          : localPrincipal(options.principal),
      db: options.db,
    }),
  )
  app.route('/', staticRoutes())

  return app
}

export type App = ReturnType<typeof createApp>
