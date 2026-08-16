import type { Readable } from 'node:stream'

import { z } from 'zod'

import { CliError } from '../../errors'

const sessionIdPattern = /^[A-Za-z0-9._:-]+$/
const hookInputSchema = z.object({
  session_id: z.string().trim().min(1).regex(sessionIdPattern),
})

export async function readHookSessionId(stream: Readable): Promise<string> {
  let input = ''

  for await (const chunk of stream) {
    input += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
  }

  if (!input.trim()) {
    throw invalidHookInput('Hook input must be a JSON object with a session_id.')
  }

  let payload: unknown

  try {
    payload = JSON.parse(input)
  } catch {
    throw invalidHookInput('Hook input must contain valid JSON.')
  }

  const parsed = hookInputSchema.safeParse(payload)

  if (!parsed.success) {
    throw invalidHookInput('Hook input must include a supported string session_id.')
  }

  return parsed.data.session_id
}

function invalidHookInput(message: string): CliError {
  return new CliError('invalid_hook_input', message, 1)
}
