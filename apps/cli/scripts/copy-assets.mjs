import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Migrations live in packages/db for drizzle-kit. Once that package is inlined into this bundle,
// its `../migrations` resolves to the cli package root.
const here = dirname(fileURLToPath(import.meta.url))
const from = resolve(here, '../../../packages/db/migrations')
const to = resolve(here, '../migrations')

if (!existsSync(from)) {
  console.error(`missing build input: ${from}`)
  process.exit(1)
}

// Cleared rather than merged: a migration deleted upstream would otherwise linger here and get
// applied on a user's machine.
rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })
console.log(`copied ${from} → ${to}`)
