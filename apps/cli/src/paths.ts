import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// assets/ sits as a sibling of src/, not inside it, so tsup never pulls it into the module graph.
// `../assets` resolves to the package root from both dist/ and src/, so running from the
// workspace reads the source files and prompt iteration needs no rebuild.
export const assetsDir = fileURLToPath(new URL('../assets', import.meta.url))

export const claudeCodeAssetsDir = fileURLToPath(new URL('../assets/claude-code', import.meta.url))
export const codexAssetsDir = fileURLToPath(new URL('../assets/codex', import.meta.url))

const require = createRequire(import.meta.url)

export function packageVersion(): string {
  const pkg = require('../package.json') as { version: string }
  return pkg.version
}

// Hook config points at this, never `npx` — cold resolution would add hundreds of milliseconds
// to every edit tool call.
export function binaryPath(): string {
  return process.argv[1] ?? 'agent-rooms'
}
