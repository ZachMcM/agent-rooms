import { drizzle } from 'drizzle-orm/libsql'

import { relations } from './relations'

export type DatabaseConnection = {
  url: string
  authToken?: string
}

// Local is a `file:` url under the user-global data dir; cloud is a Turso url plus auth token.
// One dialect, one migration set — local vs cloud is a connection string.
export function createDatabase(connection: DatabaseConnection) {
  return drizzle({ connection, relations })
}

export type Database = ReturnType<typeof createDatabase>
