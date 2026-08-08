import {
  joinRoomInputSchema,
  readDecisionsInputSchema,
  writeDecisionInputSchema,
} from '@agent-rooms/protocol'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { McpContext } from './context'
import { joinRoom, readDecisions, writeDecision } from './tools'

export type CreateMcpServerOptions = {
  ctx: McpContext
  version: string
}

const SESSION_ID_NOTE =
  'Supplied by the agent-rooms PreToolUse hook, not by the model. Leave it out.'

function jsonResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

export function createMcpServer({ ctx, version }: CreateMcpServerOptions) {
  const server = new McpServer({ name: 'agent-rooms', version })

  server.registerTool(
    'join_room',
    {
      title: 'Join a room',
      description: `Register this session in a room under a human-readable agent label. ${SESSION_ID_NOTE}`,
      inputSchema: joinRoomInputSchema.shape,
    },
    async (params) => jsonResult(await joinRoom(ctx, params)),
  )

  server.registerTool(
    'write_decision',
    {
      title: 'Write a decision',
      description: `Record a decision another parallel agent might need to know about. Write the reasoning, not the diff. ${SESSION_ID_NOTE}`,
      inputSchema: writeDecisionInputSchema.shape,
    },
    async (params) => jsonResult(await writeDecision(ctx, params)),
  )

  server.registerTool(
    'read_decisions',
    {
      title: 'Read decisions',
      description: `Read the room's decisions. Defaults to a full dump; pass a query to search. ${SESSION_ID_NOTE}`,
      inputSchema: readDecisionsInputSchema.shape,
    },
    async (params) => jsonResult(await readDecisions(ctx, params)),
  )

  return server
}

export type AgentRoomsMcpServer = ReturnType<typeof createMcpServer>
