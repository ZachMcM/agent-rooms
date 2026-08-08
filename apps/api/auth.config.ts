import type { Database } from '@agent-rooms/db'

import { createAuth } from './src/auth'

// Config-only entry point for `pnpm --filter @agent-rooms/api auth:generate`. Nothing imports it
// at runtime — the api builds its real instance in src/server.ts, from the real db and secret.
//
// It exists because the generator needs a constructed auth instance to read the adapter's table
// shape off, and createAuth is a factory. Generation never opens a connection and never signs
// anything, so both arguments below are stand-ins.
export const auth = createAuth({
  db: {} as Database,
  secret: 'not-a-secret-generation-only',
})
