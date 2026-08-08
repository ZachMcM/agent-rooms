import { z } from 'zod'

export const modeSchema = z.enum(['local', 'cloud'])

export type Mode = z.infer<typeof modeSchema>

export const MODE_ENV_VAR = 'AGENT_COMMS_MODE'

export function resolveMode(env: NodeJS.ProcessEnv = process.env): Mode {
  return modeSchema.catch('local').parse(env[MODE_ENV_VAR])
}
