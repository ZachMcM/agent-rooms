import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requiredFiles = [
  'assets/agent-rooms/SKILL.md',
  'assets/dashboard/server/index.mjs',
  'dist/index.js',
]
const missing = requiredFiles.filter((path) => !existsSync(resolve(root, path)))
const migrations = resolve(root, 'migrations')
const dashboardAssets = resolve(root, 'assets/dashboard/public/assets')
const dashboardMigrations = resolve(root, 'assets/dashboard/migrations')

if (
  !existsSync(migrations) ||
  !statSync(migrations).isDirectory() ||
  readdirSync(migrations, { recursive: true }).every((path) => !path.endsWith('.sql'))
) {
  missing.push('migrations/*')
}

if (
  !existsSync(dashboardAssets) ||
  !statSync(dashboardAssets).isDirectory() ||
  !readdirSync(dashboardAssets, { recursive: true }).some((path) =>
    statSync(resolve(dashboardAssets, path)).isFile(),
  )
) {
  missing.push('assets/dashboard/public/assets/*')
}

if (
  !existsSync(dashboardMigrations) ||
  !statSync(dashboardMigrations).isDirectory() ||
  readdirSync(dashboardMigrations, { recursive: true }).every((path) => !path.endsWith('.sql'))
) {
  missing.push('assets/dashboard/migrations/*')
}

if (missing.length > 0) {
  console.error(`package build is incomplete: ${missing.join(', ')}`)
  process.exit(1)
}
