import { z } from 'zod'

// Enumerated rather than left a free string: a free label fragments across agents (`api`, `API`,
// `api-contract`) and then cannot be filtered on, which defeats having the column.
export const MESSAGE_KINDS = ['decision', 'warning', 'question', 'answer', 'status'] as const

export const messageKindSchema = z.enum(MESSAGE_KINDS)

export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerUserId: z.string(),
  createdAt: z.iso.datetime(),
})

export const membershipSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  sessionId: z.string(),
  cursor: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
})

export const messageSchema = z.object({
  id: z.number().int().positive(),
  roomId: z.string(),
  membershipId: z.string(),
  kind: messageKindSchema,
  body: z.string(),
  createdAt: z.iso.datetime(),
})

export type MessageKind = (typeof MESSAGE_KINDS)[number]
export type Room = z.infer<typeof roomSchema>
export type Membership = z.infer<typeof membershipSchema>
export type Message = z.infer<typeof messageSchema>
