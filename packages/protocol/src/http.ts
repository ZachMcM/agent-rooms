import { z } from 'zod'

import { decisionSchema, membershipSchema, roomSchema } from './entities'
import { principalSchema } from './principal'

// Better Auth owns every path below this prefix. It lives in the protocol rather than in the api
// because both sides depend on it: the api mounts the handler here, and the SPA's auth client
// points at the same string. The frontend is always same-origin with its api, so a shared path is
// the whole contract — there is no base url to agree on.
export const AUTH_BASE_PATH = '/api/auth'

// The SPA fetches this on boot to learn its mode. One build artifact works in both places.
export const runtimeConfigSchema = z.object({
  mode: z.enum(['local', 'cloud']),
  version: z.string(),
  // Local mode has one fixed principal and never runs an auth flow, so the SPA is handed it here
  // and its route guards always pass. Cloud sends null: there the principal comes from the Better
  // Auth session, and this endpoint is deliberately reachable without one.
  principal: principalSchema.nullable(),
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
