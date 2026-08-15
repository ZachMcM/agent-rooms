import type { Readable } from 'node:stream'

import { CliError } from '../../errors'

const sessionIdPattern = /^[A-Za-z0-9._:-]+$/

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

  if (!isRecord(payload)) {
    throw invalidHookInput('Hook input must be a JSON object with a session_id.')
  }

  const sessionId = payload.session_id

  if (typeof sessionId !== 'string') {
    throw invalidHookInput('Hook input must include a string session_id.')
  }

  const normalizedSessionId = sessionId.trim()

  if (!normalizedSessionId || !sessionIdPattern.test(normalizedSessionId)) {
    throw invalidHookInput('Hook input session_id contains unsupported characters.')
  }

  return normalizedSessionId
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidHookInput(message: string): CliError {
  return new CliError('invalid_hook_input', message, 1)
}
