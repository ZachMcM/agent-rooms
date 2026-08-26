import { mkdir } from 'node:fs/promises'

import { dataDir } from '@coordrooms/core'
import { createDatabase, runMigrations, type Database } from '@coordrooms/db'

export async function openDatabase(): Promise<Database> {
  await mkdir(dataDir(), { recursive: true })
  const db = await createDatabase()
  await runMigrations(db)
  return db
}
