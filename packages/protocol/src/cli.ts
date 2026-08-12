import { z } from 'zod'

import { decisionSchema, membershipSchema } from './entities'

// The session is resolved by walking the process tree into the registry the session-start hook
// writes, so the model never supplies it. `--session` stays available as an override for harnesses
// that can substitute it into a command file.
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
  // Full-text, not semantic. Injection is cursor-based and never ranked.
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
