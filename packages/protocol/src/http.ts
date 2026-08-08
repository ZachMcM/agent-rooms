import { z } from 'zod'

import { decisionSchema, membershipSchema, roomSchema } from './entities'

// The SPA fetches this on boot to learn its mode. One build artifact works in both places.
export const runtimeConfigSchema = z.object({
  mode: z.enum(['local', 'cloud']),
  version: z.string(),
})

export const listRoomsResponseSchema = z.object({
  rooms: z.array(roomSchema),
})

export const getRoomResponseSchema = z.object({
  room: roomSchema,
  memberships: z.array(membershipSchema),
})

export const listDecisionsResponseSchema = z.object({
  decisions: z.array(decisionSchema),
})

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>
export type ListRoomsResponse = z.infer<typeof listRoomsResponseSchema>
export type GetRoomResponse = z.infer<typeof getRoomResponseSchema>
export type ListDecisionsResponse = z.infer<typeof listDecisionsResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
