import type { Database } from '@agent-rooms/db'
import { Hono } from 'hono'

import type { AppBindings } from '../types'

// Routes never import the db client directly — they call domain functions that take the
// principal as their first argument.
export function roomRoutes(_db: Database) {
  return new Hono<AppBindings>()
    .get('/', (c) => {
      const _principal = c.get('principal')
      // TODO: return listRooms(db, principal)
      return c.json({ rooms: [] })
    })
    .get('/:roomId', (c) => {
      const _principal = c.get('principal')
      // TODO: return the room plus its memberships
      return c.json({ error: { code: 'not_found', message: 'not implemented' } }, 404)
    })
    .get('/:roomId/messages', (c) => {
      const _principal = c.get('principal')
      // TODO: return readMessages(db, principal, { roomId, kind, query })
      return c.json({ messages: [] })
    })
}
