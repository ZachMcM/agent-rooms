import type { Mode } from '@agent-rooms/core'
import type { Database } from '@agent-rooms/db'
import { Hono } from 'hono'

import type { AppBindings } from '../types'
import { configRoutes } from './config'
import { roomRoutes } from './rooms'

export function apiRoutes(mode: Mode, version: string, db: Database) {
  return new Hono<AppBindings>()
    .route('/config', configRoutes(mode, version))
    .route('/rooms', roomRoutes(db))
}
