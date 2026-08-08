import { fileURLToPath } from 'node:url'

import { Hono } from 'hono'

import type { AppBindings } from './types'

// The web build is copied here at api#build time. Resolved from import.meta.url so it survives
// being bundled into the published cli and run from an arbitrary cwd.
export const webRoot = fileURLToPath(new URL('./public', import.meta.url))

export function staticRoutes() {
  return new Hono<AppBindings>().get('*', (c) => {
    // TODO: serve webRoot with @hono/node-server/serve-static and fall back to index.html so
    // client-side routes resolve. Same in local and cloud — the frontend is always same-origin.
    return c.text('web build not mounted', 404)
  })
}
