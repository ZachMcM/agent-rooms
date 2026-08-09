import { z } from 'zod'

import { decisionSchema, membershipSchema } from './entities'

// session_id is injected into every tool call by the PreToolUse hook, not supplied by the model.
export const sessionIdSchema = z.string().min(1)

export const joinRoomInputSchema = z.object({
  sessionId: sessionIdSchema,
  roomName: z.string().min(1),
  agentLabel: z.string().min(1),
})

export const joinRoomOutputSchema = z.object({
  membership: membershipSchema,
})

export const writeDecisionInputSchema = z.object({
  sessionId: sessionIdSchema,
  body: z.string().min(1),
})

export const writeDecisionOutputSchema = z.object({
  decision: decisionSchema,
})

export const readDecisionsInputSchema = z.object({
  sessionId: sessionIdSchema,
  // past MVP; injection is never semantic.
  query: z.string().min(1).optional(),
})

export const readDecisionsOutputSchema = z.object({
  decisions: z.array(decisionSchema),
})

export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>
export type JoinRoomOutput = z.infer<typeof joinRoomOutputSchema>
export type WriteDecisionInput = z.infer<typeof writeDecisionInputSchema>
export type WriteDecisionOutput = z.infer<typeof writeDecisionOutputSchema>
export type ReadDecisionsInput = z.infer<typeof readDecisionsInputSchema>
export type ReadDecisionsOutput = z.infer<typeof readDecisionsOutputSchema>

export const MCP_TOOL_NAMES = ['join_room', 'write_decision', 'read_decisions'] as const

export type McpToolName = (typeof MCP_TOOL_NAMES)[number]
