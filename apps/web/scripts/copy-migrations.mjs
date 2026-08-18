import { cp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../../../packages/db/migrations/', import.meta.url))
const destination = fileURLToPath(new URL('../.output/server/migrations/', import.meta.url))

await rm(destination, { recursive: true, force: true })
await cp(source, destination, { recursive: true })
