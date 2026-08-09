import { loadEnv, resolveDbUrl, resolveTrustedOrigins } from '@agent-rooms/core'
import { createDatabase } from '@agent-rooms/db/client'
import { serve } from '@hono/node-server'

import { createApp } from './app'
import { createAuth } from './auth'

// The cloud process entry. Its local counterpart is not in this package at all: `agent-rooms web`
// (apps/cli/src/commands/web.ts) builds a local runtime and boots the same createApp in-process,
// because the cli is the only thing that ships to a user's machine.
const env = loadEnv()

// This file hardcodes mode: 'cloud', so the environment has to say the same thing. Asserting it
// is what makes the auth secret mandatory: loadEnv only demands one when the mode is cloud, and
// without this a deploy that forgot the variable would boot the cloud app past that check.
if (env.AGENT_ROOMS_MODE !== 'cloud') {
  throw new Error('cloud.ts is the cloud entry point — set AGENT_ROOMS_MODE=cloud')
}

// Guaranteed by loadEnv given the assertion above; repeated here so the type narrows to string.
const authSecret = env.AGENT_ROOMS_AUTH_SECRET
if (!authSecret) throw new Error('AGENT_ROOMS_AUTH_SECRET is required when AGENT_ROOMS_MODE=cloud')

// One connection, shared by the domain layer and Better Auth. They own disjoint tables, and a
// second client would mean a second write lock queue against the same file.
const db = createDatabase({ url: resolveDbUrl(env), authToken: env.AGENT_ROOMS_DB_AUTH_TOKEN })

const app = createApp({
  mode: 'cloud',
  db,
  auth: createAuth({
    db,
    secret: authSecret,
    baseURL: env.AGENT_ROOMS_AUTH_URL,
    trustedOrigins: resolveTrustedOrigins(env),
  }),
  version: process.env.npm_package_version ?? '0.0.0',
})

serve({ fetch: app.fetch, hostname: env.AGENT_ROOMS_HOST, port: env.AGENT_ROOMS_PORT }, (info) => {
  console.log(`agent-rooms api listening on http://${env.AGENT_ROOMS_HOST}:${info.port}`)
})
