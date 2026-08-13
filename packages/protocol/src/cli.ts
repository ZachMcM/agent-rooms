import { z } from 'zod'

import { membershipSchema, messageKindSchema, messageSchema } from './entities'

// The agent carries the conversation id and passes --conversation on every call. It is derived,
// not minted: a hash of the harness plus its native conversation id, so it survives a resume.
export const conversationIdSchema = z.string().min(1)

export const joinRoomInputSchema = z.object({
  conversationId: conversationIdSchema,
  roomName: z.string().min(1),
})

export const joinRoomOutputSchema = z.object({
  membership: membershipSchema,
})

export const writeMessageInputSchema = z.object({
  conversationId: conversationIdSchema,
  kind: messageKindSchema,
  body: z.string().min(1),
})

export const writeMessageOutputSchema = z.object({
  message: messageSchema,
})

export const readMessagesInputSchema = z.object({
  conversationId: conversationIdSchema,
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
