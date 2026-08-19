import { createRequire } from 'node:module'

import {
  ActiveMembershipConflictError,
  ActiveMembershipNotFoundError,
  createRoom,
  InvalidMessagesError,
  joinRoom,
  leaveRoom,
  listActiveRooms,
  listRoomMessages,
  MembershipConflictError,
  MembershipNotFoundError,
  NON_ANSWER_MESSAGE_KINDS,
  RoomNameConflictError,
  RoomNotFoundError,
  writeMessages,
} from '@agent-rooms/db'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { openDatabase } from './database'

const require = createRequire(import.meta.url)
const packageVersion = (require('../package.json') as { version: string }).version

const textSchema = z.string().trim().min(1)
const messageSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('answer'),
    body: textSchema,
    replyToMessageId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  }),
  z.strictObject({ kind: z.enum(NON_ANSWER_MESSAGE_KINDS), body: textSchema }),
])

export function createMcpServer(
  open: typeof openDatabase = openDatabase,
  version: string = packageVersion,
): McpServer {
  const server = new McpServer(
    {
      name: 'agent-rooms',
      version,
    },
    {
      instructions:
        'Use the lifecycle-injected conversation ID for membership-scoped tools. Never invent a conversation ID. Use list_room_messages for complete history; it does not consume lifecycle messages.',
    },
  )

  server.registerTool(
    'create_room',
    { description: 'Creates a room and joins the supplied conversation.', inputSchema: roomSchema },
    async (input) => call(async () => createRoom(await open(), input)),
  )
  server.registerTool(
    'join_room',
    {
      description: 'Joins an existing room with the supplied conversation.',
      inputSchema: roomSchema,
    },
    async (input) => call(async () => joinRoom(await open(), input)),
  )
  server.registerTool(
    'list_active_rooms',
    {
      description: 'Lists rooms with active members.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => call(async () => listActiveRooms(await open())),
  )
  server.registerTool(
    'list_room_messages',
    {
      description: 'Lists complete history for the supplied conversation’s active room.',
      inputSchema: conversationSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => call(async () => listRoomMessages(await open(), input)),
  )
  server.registerTool(
    'write_messages',
    {
      description: 'Writes messages to the supplied conversation’s active room.',
      inputSchema: { ...conversationSchema, messages: z.array(messageSchema).min(1) },
    },
    async (input) => call(async () => writeMessages(await open(), input)),
  )
  server.registerTool(
    'leave_room',
    { description: 'Leaves a room with the supplied conversation.', inputSchema: roomSchema },
    async (input) => call(async () => leaveRoom(await open(), input)),
  )

  return server
}

export async function runMcpServer(): Promise<void> {
  await createMcpServer().connect(new StdioServerTransport())
}

const conversationSchema = { conversationId: textSchema }
const roomSchema = { roomName: textSchema, conversationId: textSchema }

async function call(operation: () => Promise<unknown>) {
  try {
    const result = await operation()
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      structuredContent: { result },
    }
  } catch (error) {
    const failure = mcpFailure(error)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(failure) }],
      structuredContent: failure,
      isError: true,
    }
  }
}

function mcpFailure(error: unknown): { code: string; message: string } {
  if (error instanceof RoomNameConflictError)
    return { code: 'room_name_conflict', message: error.message }
  if (error instanceof RoomNotFoundError) return { code: 'room_not_found', message: error.message }
  if (error instanceof MembershipConflictError)
    return { code: 'membership_conflict', message: error.message }
  if (error instanceof ActiveMembershipConflictError)
    return { code: 'active_membership_conflict', message: error.message }
  if (error instanceof MembershipNotFoundError)
    return { code: 'membership_not_found', message: error.message }
  if (error instanceof ActiveMembershipNotFoundError)
    return { code: 'active_membership_not_found', message: error.message }
  if (error instanceof InvalidMessagesError)
    return { code: 'invalid_arguments', message: error.message }
  return { code: 'internal_error', message: 'Agent Rooms could not complete this operation.' }
}
