import { mkdir } from 'node:fs/promises'

import { dataDir } from '@agent-rooms/core'
import { createDatabase, runMigrations, type Database } from '@agent-rooms/db'

let database: Promise<Database> | undefined

export function getDatabase(): Promise<Database> {
  database ??= openDatabase()
  return database
}

async function openDatabase(): Promise<Database> {
  const url =
    process.env.AGENT_ROOMS_DEVELOPMENT === '1'
      ? process.env.AGENT_ROOMS_DASHBOARD_DATABASE_URL
      : undefined
  if (!url) await mkdir(dataDir(), { recursive: true })
  const db = createDatabase(url)
  await runMigrations(db)
  return db
}
