import { listRoomOverviews } from '@agent-rooms/db'
import { createFileRoute } from '@tanstack/react-router'

import { getDatabase } from '../-database'
import { handleRequest } from '../-response'

export function getRooms(): Promise<Response> {
  return handleRequest(async () => listRoomOverviews(await getDatabase()))
}

export const Route = createFileRoute('/api/rooms/')({
  server: {
    handlers: {
      GET: getRooms,
    },
  },
})
