import { z } from 'zod'

import { dbFileUrl } from './paths'

// TODO: extend as cloud lands — Turso credentials, rate limit config.
const envSchema = z
  .object({
    AGENT_ROOMS_MODE: z.enum(['local', 'cloud']).default('local'),
    AGENT_ROOMS_DB_URL: z.string().min(1).optional(),
    AGENT_ROOMS_DB_AUTH_TOKEN: z.string().min(1).optional(),
    AGENT_ROOMS_HOST: z.string().min(1).default('127.0.0.1'),
    AGENT_ROOMS_PORT: z.coerce.number().int().positive().default(4319),
    // Better Auth signs session cookies and tokens with this. Namespaced rather than using
    // Better Auth's own BETTER_AUTH_SECRET so one prefix still covers the whole app.
    AGENT_ROOMS_AUTH_SECRET: z.string().min(32).optional(),
    // The public origin the api is served on. Better Auth needs it to build callbacks and to
    // decide which origins may post to it; behind a proxy the request headers alone are wrong.
    AGENT_ROOMS_AUTH_URL: z.url().optional(),
    // Extra origins allowed to call the auth endpoints, comma separated. The frontend is
    // same-origin with the api in both modes, so this stays empty unless something else logs in.
    AGENT_ROOMS_TRUSTED_ORIGINS: z.string().min(1).optional(),
  })
  // Cloud only, and enforced rather than defaulted: with no secret Better Auth invents a random
  // one per process, which silently signs out every user on restart and differs across replicas.
  .refine((env) => env.AGENT_ROOMS_MODE !== 'cloud' || Boolean(env.AGENT_ROOMS_AUTH_SECRET), {
    error: 'AGENT_ROOMS_AUTH_SECRET is required when AGENT_ROOMS_MODE=cloud',
    path: ['AGENT_ROOMS_AUTH_SECRET'],
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
  return env.AGENT_ROOMS_DB_URL ?? dbFileUrl()
}

export function resolveTrustedOrigins(env: Env): string[] {
  return (env.AGENT_ROOMS_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}
