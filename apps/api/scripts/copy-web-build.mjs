import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, '../../web/dist')
const destination = resolve(here, '../dist/public')

if (!existsSync(source)) {
  console.error(
    `web build not found at ${source} — run \`turbo run build --filter=@agent-rooms/web\``,
  )
  process.exit(1)
}

mkdirSync(destination, { recursive: true })
cpSync(source, destination, { recursive: true })
console.log(`copied web build → ${destination}`)
