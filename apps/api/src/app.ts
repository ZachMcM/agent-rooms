import { Hono } from 'hono'

import { localPrincipal, sessionPrincipal } from './middleware/principal'
import { rateLimit } from './middleware/rate-limit'
import { apiRoutes } from './routes'
import { staticRoutes } from './static'
import type { AppBindings, CreateAppOptions } from './types'

// Exports a factory rather than self-starting on import: the cli boots this in-process, cloud
// serves the same app from src/server.ts.
export function createApp(options: CreateAppOptions) {
  const app = new Hono<AppBindings>()

  app.use('*', options.mode === 'cloud' ? sessionPrincipal : localPrincipal(options.principal))
  if (options.mode === 'cloud') app.use('*', rateLimit())

  app.route('/api', apiRoutes(options.mode, options.version, options.db))
  app.route('/', staticRoutes())

  return app
}

export type App = ReturnType<typeof createApp>
