import { type RuntimeConfig, runtimeConfigSchema } from '@agent-rooms/protocol'

// One build artifact works in both places: mode is fetched at boot, never baked in at build time.
export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`GET /api/config responded ${response.status}`)
  }
  // Parsed, not cast. This is the one response the whole app's mode branch hangs off, and it is
  // fetched before any session exists, so a misconfigured deploy should fail here and loudly.
  return runtimeConfigSchema.parse(await response.json())
}
