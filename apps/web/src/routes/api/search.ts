import { InvalidSearchLimitError, searchRoomsAndMessages } from '@agent-rooms/db'
import { createFileRoute } from '@tanstack/react-router'

import { getDatabase } from './-database'
import { errorResponse, handleRequest } from './-response'

export function getSearch(request: Request): Promise<Response> {
  const searchParams = new URL(request.url).searchParams
  const query = searchParams.get('query')
  const limit = searchParams.get('limit')
  const roomId = searchParams.get('roomId')

  return handleRequest(async () => {
    try {
      return await searchRoomsAndMessages(await getDatabase(), {
        query: query ?? '',
        roomId: roomId || undefined,
        limit: limit === null ? undefined : Number(limit),
      })
    } catch (error) {
      if (error instanceof InvalidSearchLimitError) {
        return errorResponse(400, 'invalid_search_limit', error.message)
      }

      throw error
    }
  })
}

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: ({ request }) => getSearch(request),
    },
  },
})
