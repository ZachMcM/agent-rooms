import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/libsql/migrator'

import type { Database } from './client'

export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url))

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder })
}
