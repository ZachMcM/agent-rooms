import { mkdir } from 'node:fs/promises'

import { dataDir } from '@agent-rooms/core'
import { createDatabase, runMigrations, type Database } from '@agent-rooms/db'

export async function openDatabase(): Promise<Database> {
  await mkdir(dataDir(), { recursive: true })
  const db = await createDatabase()
  await runMigrations(db)
  return db
}
