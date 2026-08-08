import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/libsql/migrator'

import type { Database } from './client'

// This is the *runtime* half of migrations, not a duplicate of drizzle-kit.
//
// `drizzle-kit generate` authors migration SQL from schema.ts, and `drizzle-kit migrate` applies
// it to a developer's database. Both are dev-time: drizzle-kit is a devDependency and is not
// present on an end user's machine. The published cli ships the generated `migrations/` folder
// and has to bring `~/.agent-comms/db.sqlite` up to date itself on first run — that is this.
//
// Resolved from import.meta.url, never process.cwd(): once bundled into the published cli the
// migrations folder sits at package root and this file runs from dist/.
export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url))

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder })
}
