import { dbFileUrl } from '@agent-rooms/core'
import { defineConfig } from 'drizzle-kit'

// `turso` is drizzle-kit's libSQL dialect and covers `file:` urls. The url comes from core so
// drizzle-kit can never migrate a different file than the one the app opens.
export default defineConfig({
  dialect: 'turso',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: dbFileUrl() },
})
