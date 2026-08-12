import { z } from 'zod'

import { membershipSchema, messageKindSchema, messageSchema } from './entities'

// The session is resolved by walking the process tree into the registry the session-start hook
// writes, so the model never supplies it. `--session` stays available as an override for harnesses
// that can substitute it into a command file.
export const sessionIdSchema = z.string().min(1)

export const joinRoomInputSchema = z.object({
  sessionId: sessionIdSchema,
  roomName: z.string().min(1),
})

export const joinRoomOutputSchema = z.object({
  membership: membershipSchema,
})

export const writeMessageInputSchema = z.object({
  sessionId: sessionIdSchema,
  kind: messageKindSchema,
  body: z.string().min(1),
})

export const writeMessageOutputSchema = z.object({
  message: messageSchema,
})

export const readMessagesInputSchema = z.object({
  sessionId: sessionIdSchema,
  kind: messageKindSchema.optional(),
  // Full-text, not semantic. Injection is cursor-based and never ranked.
  query: z.string().min(1).optional(),
})

export const readMessagesOutputSchema = z.object({
  messages: z.array(messageSchema),
})

export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>
export type JoinRoomOutput = z.infer<typeof joinRoomOutputSchema>
export type WriteMessageInput = z.infer<typeof writeMessageInputSchema>
export type WriteMessageOutput = z.infer<typeof writeMessageOutputSchema>
export type ReadMessagesInput = z.infer<typeof readMessagesInputSchema>
export type ReadMessagesOutput = z.infer<typeof readMessagesOutputSchema>
