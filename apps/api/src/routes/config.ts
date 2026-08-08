import type { RuntimeConfig } from '@agent-rooms/protocol'
import { Hono } from 'hono'

import type { AppBindings } from '../types'

// The config is built once at startup and served verbatim. Nothing here reads the request, which
// is what keeps mode a startup fact rather than a per-request branch.
export function configRoutes(config: RuntimeConfig) {
  return new Hono<AppBindings>().get('/', (c) => c.json(config))
}
