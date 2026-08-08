import { type Env, loadEnv, resolveDbUrl } from '@agent-comms/core'
import { type Database, createDatabase } from '@agent-comms/db/client'
import type { Principal } from '@agent-comms/protocol'

export type LocalRuntime = {
  env: Env
  db: Database
  principal: Principal
  version: string
}

// TODO: generate a uuid at first run and persist it beside the db. A literal 'local' would mean
// every local row carries it permanently, making a later import into a real account a rewrite pass.
export function resolveLocalPrincipal(): Principal {
  throw new Error('not implemented')
}

// TODO: await runMigrations(db) from @agent-comms/db before returning. drizzle-kit is a
// devDependency and never reaches a user's machine, so the shipped migrations/ folder has to be
// applied here on boot. That makes this async.
export function createLocalRuntime(version: string): LocalRuntime {
  const env = loadEnv()
  return {
    env,
    db: createDatabase({ url: resolveDbUrl(env), authToken: env.AGENT_COMMS_DB_AUTH_TOKEN }),
    principal: resolveLocalPrincipal(),
    version,
  }
}
