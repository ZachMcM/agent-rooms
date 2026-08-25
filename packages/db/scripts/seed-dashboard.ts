import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDatabase } from '../src/client'
import { seedDashboardDatabase } from '../src/development/seed'
import { runMigrations } from '../src/migrator'

const repositoryPath = fileURLToPath(new URL('../../../', import.meta.url))
const databaseDirectory = join(repositoryPath, '.agent-rooms')
const databasePath = join(databaseDirectory, 'dashboard-dev.sqlite')
const databaseUrl = `file:${databasePath}`

await mkdir(databaseDirectory, { recursive: true })

const db = await createDatabase(databaseUrl)
await runMigrations(db)
const summary = await seedDashboardDatabase(db)

console.log(JSON.stringify({ databasePath, databaseUrl, summary }))
