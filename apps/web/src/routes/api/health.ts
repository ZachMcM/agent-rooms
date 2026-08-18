import { createFileRoute } from '@tanstack/react-router'

export function getHealth(): Response {
  return Response.json({ ok: true })
}

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: getHealth,
    },
  },
})
