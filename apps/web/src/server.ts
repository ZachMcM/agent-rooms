import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

export default createServerEntry({
  fetch(request) {
    if (new URL(request.url).pathname === '/api/health') {
      return Response.json({ ok: true })
    }

    return handler.fetch(request)
  },
})
