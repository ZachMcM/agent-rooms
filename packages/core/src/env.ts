import { z } from 'zod'

import { dbFileUrl } from './paths'

// TODO: extend as cloud lands — Turso credentials, Better Auth secrets, rate limit config.
const envSchema = z.object({
  AGENT_COMMS_MODE: z.enum(['local', 'cloud']).default('local'),
  AGENT_COMMS_DB_URL: z.string().min(1).optional(),
  AGENT_COMMS_DB_AUTH_TOKEN: z.string().min(1).optional(),
  AGENT_COMMS_HOST: z.string().min(1).default('127.0.0.1'),
  AGENT_COMMS_PORT: z.coerce.number().int().positive().default(4319),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

export function resolveDbUrl(env: Env): string {
  return env.AGENT_COMMS_DB_URL ?? dbFileUrl()
}
