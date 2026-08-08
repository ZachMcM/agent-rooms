import { connectStdio, createMcpServer } from '@agent-comms/mcp'
import { Command } from 'commander'

import { packageVersion } from '../paths'
import { createLocalRuntime } from '../runtime'

export function mcpCommand(): Command {
  return new Command('mcp').description('Run the MCP server over stdio').action(async () => {
    const version = packageVersion()
    const { db, principal } = createLocalRuntime(version)
    await connectStdio(createMcpServer({ ctx: { db, principal }, version }))
  })
}
