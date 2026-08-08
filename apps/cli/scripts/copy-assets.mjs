import { cpSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// `assets/` already sits at package root and ships as-is. Everything else here is a real copy
// step: bundlers ignore non-code assets, and they must resolve at runtime via import.meta.url.
const here = dirname(fileURLToPath(import.meta.url))

const copies = [
  // Drizzle migrations live in packages/db for drizzle-kit. Once the db package is inlined into
  // this bundle, its `../migrations` resolves to the cli package root.
  { from: resolve(here, '../../../packages/db/migrations'), to: resolve(here, '../migrations') },
  // The api's static handler resolves `./public` relative to its own module, which after
  // inlining is dist/.
  { from: resolve(here, '../../web/dist'), to: resolve(here, '../dist/public') },
]

for (const { from, to } of copies) {
  if (!existsSync(from)) {
    console.error(`missing build input: ${from}`)
    process.exit(1)
  }
  cpSync(from, to, { recursive: true })
  console.log(`copied ${from} → ${to}`)
}
