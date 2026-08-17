import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Migrations live in packages/db for drizzle-kit. Once that package is inlined into this bundle,
// its `../migrations` resolves to the cli package root.
const here = dirname(fileURLToPath(import.meta.url))
const migrationsFrom = resolve(here, '../../../packages/db/migrations')
const migrationsTo = resolve(here, '../migrations')
const dashboardFrom = resolve(here, '../../web/.output')
const dashboardTo = resolve(here, '../assets/dashboard')

for (const source of [migrationsFrom, dashboardFrom]) {
  if (!existsSync(source)) {
    console.error(`missing build input: ${source}`)
    process.exit(1)
  }
}

// Cleared rather than merged: a migration deleted upstream would otherwise linger here and get
// applied on a user's machine.
rmSync(migrationsTo, { recursive: true, force: true })
cpSync(migrationsFrom, migrationsTo, { recursive: true })
rmSync(dashboardTo, { recursive: true, force: true })
cpSync(dashboardFrom, dashboardTo, { recursive: true })
console.log(`copied ${migrationsFrom} → ${migrationsTo}`)
console.log(`copied ${dashboardFrom} → ${dashboardTo}`)
