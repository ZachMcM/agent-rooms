import { mkdir } from 'node:fs/promises'

import { dataDir } from '@coordrooms/core'
import { createDatabase, runMigrations, type Database } from '@coordrooms/db'

let database: Promise<Database> | undefined

export function getDatabase(): Promise<Database> {
  database ??= openDatabase()
  return database
}

async function openDatabase(): Promise<Database> {
  const url =
    process.env.COORDROOMS_DEVELOPMENT === '1'
      ? process.env.COORDROOMS_DASHBOARD_DATABASE_URL
      : undefined
  if (!url) await mkdir(dataDir(), { recursive: true })
  const db = await createDatabase(url)
  await runMigrations(db)
  return db
}
