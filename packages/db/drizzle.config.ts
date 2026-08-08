import { loadEnv, resolveDbUrl } from '@agent-comms/core'
import { defineConfig } from 'drizzle-kit'

// `turso` is drizzle-kit's libSQL dialect. It covers both modes: local is a `file:` url under the
// user-global data dir, cloud is a Turso url plus auth token. One dialect, one migration set.
//
// The url comes from core rather than being read here: a second default would let drizzle-kit
// migrate a different database than the one the app opens, which is the exact silent failure the
// user-global path exists to prevent.
const env = loadEnv()

export default defineConfig({
  dialect: 'turso',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: resolveDbUrl(env),
    authToken: env.AGENT_COMMS_DB_AUTH_TOKEN,
  },
})
