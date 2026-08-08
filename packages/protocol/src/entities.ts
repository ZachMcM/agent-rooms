import { z } from 'zod'

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
  agentLabel: z.string(),
  cursor: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
})

export const decisionSchema = z.object({
  id: z.number().int().positive(),
  roomId: z.string(),
  membershipId: z.string(),
  agentLabel: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
})

export type Room = z.infer<typeof roomSchema>
export type Membership = z.infer<typeof membershipSchema>
export type Decision = z.infer<typeof decisionSchema>
