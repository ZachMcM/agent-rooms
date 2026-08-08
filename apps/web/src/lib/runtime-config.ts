import type { RuntimeConfig } from '@agent-rooms/protocol'

// One build artifact works in both places: mode is fetched at boot, never baked in at build time.
export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  // TODO: call GET /api/config and validate with runtimeConfigSchema
  throw new Error('not implemented')
}
