import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  InvalidSearchLimitError,
  getRoomDetail,
  listRoomOverviews,
  searchRoomsAndMessages,
  type Database,
} from '@agent-rooms/db'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'

import { getDatabase } from './database'

type Dependencies = { getDatabase: () => Promise<Database>; publicDirectory?: string }

export function createApp(dependencies: Dependencies = { getDatabase }): Express {
  const app = express()
  app.get('/api/health', (_request, response) => response.json({ ok: true }))
  app.get(
    '/api/rooms',
    asyncRoute(async (_request, response) => {
      response.json(await listRoomOverviews(await dependencies.getDatabase()))
    }),
  )
  app.get(
    '/api/rooms/:roomId',
    asyncRoute(async (request, response) => {
      const room = await getRoomDetail(await dependencies.getDatabase(), {
        roomId: stringParam(request, 'roomId'),
      })
      if (!room)
        return void response
          .status(404)
          .json({ error: { code: 'room_not_found', message: 'Room not found' } })
      response.json(room)
    }),
  )
  app.get(
    '/api/search',
    asyncRoute(async (request, response) => {
      const query = stringQuery(request, 'query') ?? ''
      const roomId = stringQuery(request, 'roomId') || undefined
      const limit = parseLimit(stringQuery(request, 'limit'))
      try {
        response.json(
          await searchRoomsAndMessages(await dependencies.getDatabase(), { query, roomId, limit }),
        )
      } catch (error) {
        if (error instanceof InvalidSearchLimitError)
          return void response
            .status(400)
            .json({ error: { code: 'invalid_search_limit', message: error.message } })
        throw error
      }
    }),
  )
  app.use('/api', (_request, response) =>
    response.status(404).json({ error: { code: 'not_found', message: 'Not found' } }),
  )
  const publicDirectory =
    dependencies.publicDirectory ?? fileURLToPath(new URL('../public/', import.meta.url))
  if (existsSync(publicDirectory)) {
    app.use(express.static(publicDirectory))
    app.get('/{*path}', (_request, response) =>
      response.sendFile('index.html', { root: publicDirectory }),
    )
  }
  app.use((_request, response) =>
    response.status(404).json({ error: { code: 'not_found', message: 'Not found' } }),
  )
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (!response.headersSent)
      response
        .status(500)
        .json({ error: { code: 'internal_error', message: 'Internal server error' } })
  })
  return app
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void run()
    async function run(): Promise<void> {
      try {
        await handler(request, response)
      } catch (error) {
        next(error)
      }
    }
  }
}

function stringQuery(request: Request, key: string): string | undefined {
  const value = request.query[key]
  return typeof value === 'string' ? value : undefined
}

function stringParam(request: Request, key: string): string {
  const value = request.params[key]
  return typeof value === 'string' ? value : ''
}

function parseLimit(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value)
}
