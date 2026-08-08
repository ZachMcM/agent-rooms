import { loadEnv, resolveDbUrl } from '@agent-comms/core'
import { createDatabase } from '@agent-comms/db/client'
import { serve } from '@hono/node-server'

import { createApp } from './app'

// Cloud entry point only. Local runs createApp({ mode: 'local' }) in-process from the cli.
const env = loadEnv()

const app = createApp({
  mode: 'cloud',
  db: createDatabase({ url: resolveDbUrl(env), authToken: env.AGENT_COMMS_DB_AUTH_TOKEN }),
  version: process.env.npm_package_version ?? '0.0.0',
})

serve({ fetch: app.fetch, hostname: env.AGENT_COMMS_HOST, port: env.AGENT_COMMS_PORT }, (info) => {
  console.log(`agent-comms api listening on http://${env.AGENT_COMMS_HOST}:${info.port}`)
})
