export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status })
}

export async function handleRequest<T>(handler: () => Promise<T | Response>): Promise<Response> {
  try {
    const response = await handler()
    return response instanceof Response ? response : Response.json(response)
  } catch {
    return errorResponse(500, 'internal_error', 'Internal server error')
  }
}
