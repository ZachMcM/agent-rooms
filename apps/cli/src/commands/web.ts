import { createApp } from '@agent-rooms/api'
import { serve } from '@hono/node-server'
import { Command } from 'commander'

import { packageVersion } from '../paths'
import { createLocalRuntime } from '../runtime'

export function webCommand(): Command {
  return new Command('web').description('Boot the local web UI, bound to 127.0.0.1').action(() => {
    const version = packageVersion()
    const { env, db, principal } = createLocalRuntime(version)
    const app = createApp({ mode: 'local', db, principal, version })

    serve(
      { fetch: app.fetch, hostname: env.AGENT_ROOMS_HOST, port: env.AGENT_ROOMS_PORT },
      (info) => {
        console.log(`agent-rooms web on http://${env.AGENT_ROOMS_HOST}:${info.port}`)
      },
    )
  })
}
