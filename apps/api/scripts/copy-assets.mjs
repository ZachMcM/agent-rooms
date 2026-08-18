import { cp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const migrationsFrom = fileURLToPath(new URL('../../../packages/db/migrations/', import.meta.url))
const migrationsTo = fileURLToPath(new URL('../dist/migrations/', import.meta.url))
const publicFrom = fileURLToPath(new URL('../../web/dist/', import.meta.url))
const publicTo = fileURLToPath(new URL('../dist/public/', import.meta.url))

await rm(migrationsTo, { recursive: true, force: true })
await cp(migrationsFrom, migrationsTo, { recursive: true })
await rm(publicTo, { recursive: true, force: true })
await cp(publicFrom, publicTo, { recursive: true })
