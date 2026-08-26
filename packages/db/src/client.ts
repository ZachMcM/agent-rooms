import { dbFileUrl } from '@coordrooms/core'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import { relations } from './relations'

// Hook processes, MCP servers, and the API all open this file at once. Without WAL +
// busy_timeout, any overlap between them fails instantly with SQLITE_BUSY. The local driver
// runs statements synchronously, so the busy-wait blocks the event loop — keep one connection
// per process and let cross-process lock waits happen here instead.
export async function createDatabase(
  url: string = dbFileUrl(),
  { busyTimeoutMs = 5000 }: { busyTimeoutMs?: number } = {},
) {
  const client = createClient({ url })
  await client.execute(`PRAGMA busy_timeout = ${busyTimeoutMs}`)
  await client.execute('PRAGMA journal_mode = WAL')
  await client.execute('PRAGMA synchronous = NORMAL')
  return drizzle({ client, relations })
}

export type Database = Awaited<ReturnType<typeof createDatabase>>
