import type { Database } from '@agent-rooms/db'
import type { RuntimeConfig } from '@agent-rooms/protocol'
import { Hono, type MiddlewareHandler } from 'hono'

import type { AppBindings } from '../types'
import { configRoutes } from './config'
import { roomRoutes } from './rooms'

export type ApiRoutesOptions = {
  config: RuntimeConfig
  principal: MiddlewareHandler<AppBindings>
  db: Database
}

export function apiRoutes(options: ApiRoutesOptions) {
  // The principal middleware is mounted inside the subtree it guards, so its reach is that mount
  // path rather than "every route registered after it". /config has to stay reachable without a
  // principal — in cloud, booting the login page is exactly that state.
  const rooms = new Hono<AppBindings>()
    .use('*', options.principal)
    .route('/', roomRoutes(options.db))

  return new Hono<AppBindings>()
    .route('/config', configRoutes(options.config))
    .route('/rooms', rooms)
}
