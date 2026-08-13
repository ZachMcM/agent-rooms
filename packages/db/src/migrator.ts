import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/libsql/migrator'

import type { Database } from './client'

// Not a duplicate of drizzle-kit: it is a devDependency and never reaches a user's machine, so the
// published cli applies its shipped migrations itself. Resolved from import.meta.url rather than
// cwd because once bundled, this runs from dist/ with migrations/ at the package root.
export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url))

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder })
}
