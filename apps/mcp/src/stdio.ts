import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import type { AgentRoomsMcpServer } from './server'

// Going cloud is swapping this for StreamableHTTPServerTransport plus a credential check. Tool
// implementations are fully shared because they take their context as a parameter.
export async function connectStdio(server: AgentRoomsMcpServer): Promise<void> {
  await server.connect(new StdioServerTransport())
}
