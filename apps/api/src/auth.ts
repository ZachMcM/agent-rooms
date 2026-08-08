import { type Database, authTables } from '@agent-rooms/db'
import { AUTH_BASE_PATH } from '@agent-rooms/protocol'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export type CreateAuthOptions = {
  db: Database
  secret: string
  baseURL?: string
  trustedOrigins?: string[]
}

// A factory, not a module-level instance, for the same reason createApp is one: the db and the
// secret are resolved once at startup by the composition root, and tests build their own.
export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    basePath: AUTH_BASE_PATH,
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(options.db, {
      provider: 'sqlite',
      schema: authTables,
      // The generated schema uses snake_case columns, matching the rest of packages/db.
      camelCase: false,
    }),
    // TODO (cloud): send the verification mail and flip requireEmailVerification on. Until an
    // email transport exists, requiring it would lock out every account at signup.
    emailAndPassword: { enabled: true },
    // TODO (cloud): social providers. Each one added here also needs its client id and secret
    // threaded through packages/core's env schema.
  })
}

export type Auth = ReturnType<typeof createAuth>
