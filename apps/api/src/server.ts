import { loadEnv, resolveDbUrl } from '@agent-rooms/core'
import { createDatabase } from '@agent-rooms/db/client'
import { serve } from '@hono/node-server'

import { createApp } from './app'

// Cloud entry point only. Local runs createApp({ mode: 'local' }) in-process from the cli.
const env = loadEnv()

const app = createApp({
  mode: 'cloud',
  db: createDatabase({ url: resolveDbUrl(env), authToken: env.AGENT_ROOMS_DB_AUTH_TOKEN }),
  version: process.env.npm_package_version ?? '0.0.0',
})

serve({ fetch: app.fetch, hostname: env.AGENT_ROOMS_HOST, port: env.AGENT_ROOMS_PORT }, (info) => {
  console.log(`agent-rooms api listening on http://${env.AGENT_ROOMS_HOST}:${info.port}`)
})
