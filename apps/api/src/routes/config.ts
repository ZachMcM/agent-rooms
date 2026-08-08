import type { Mode } from '@agent-rooms/core'
import type { RuntimeConfig } from '@agent-rooms/protocol'
import { Hono } from 'hono'

import type { AppBindings } from '../types'

export function configRoutes(mode: Mode, version: string) {
  return new Hono<AppBindings>().get('/', (c) => {
    const config: RuntimeConfig = { mode, version }
    return c.json(config)
  })
}
