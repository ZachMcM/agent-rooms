import { dbFileUrl } from '@agent-rooms/core'
import { drizzle } from 'drizzle-orm/libsql'

import { relations } from './relations'

export function createDatabase(url: string = dbFileUrl()) {
  return drizzle({ connection: { url }, relations })
}

export type Database = ReturnType<typeof createDatabase>
