import { getRoomMembers, getRoomMessages } from '@agent-rooms/db'
import { createFileRoute } from '@tanstack/react-router'

import { getDatabase } from '../-database'
import { errorResponse, handleRequest } from '../-response'

export function getRoom(roomId: string): Promise<Response> {
  return handleRequest(async () => {
    const db = await getDatabase()
    const [roomMembers, roomMessages] = await Promise.all([
      getRoomMembers(db, { roomId }),
      getRoomMessages(db, { roomId }),
    ])

    if (!roomMembers || !roomMessages) {
      return errorResponse(404, 'room_not_found', 'Room not found')
    }

    return { ...roomMembers, messages: roomMessages.messages }
  })
}

export const Route = createFileRoute('/api/rooms/$roomId')({
  server: {
    handlers: {
      GET: ({ params }) => getRoom(params.roomId),
    },
  },
})
