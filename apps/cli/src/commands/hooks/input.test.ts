import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { readHookSessionId } from './input'

function read(input: string): Promise<string> {
  return readHookSessionId(Readable.from([input]))
}

describe('readHookSessionId', () => {
  it('reads a session ID from a hook payload with extra fields', async () => {
    await expect(read('{"session_id":"  codex:abc_123  ","cwd":"/project"}')).resolves.toBe(
      'codex:abc_123',
    )
  })

  it.each([
    ['conversation_id', '{"conversation_id":"cursor:abc_123"}', 'cursor:abc_123'],
    ['sessionId', '{"sessionId":"gemini:abc_123"}', 'gemini:abc_123'],
    ['matching IDs', '{"session_id":"shared:123","conversation_id":"shared:123"}', 'shared:123'],
  ])('reads a session ID from %s', async (_case, input, expected) => {
    await expect(read(input)).resolves.toBe(expected)
  })

  it.each([
    ['', 'empty input'],
    ['not json', 'malformed JSON'],
    ['null', 'null'],
    ['[]', 'an array'],
    ['"value"', 'a scalar'],
    ['{}', 'a missing session ID'],
    ['{"session_id":1}', 'a non-string session ID'],
    ['{"session_id":"   "}', 'a blank session ID'],
    ['{"session_id":"unsafe value"}', 'whitespace in a session ID'],
    ['{"session_id":"<unsafe>"}', 'markup in a session ID'],
    ['{"session_id":"unsafe\\"value"}', 'quotes in a session ID'],
    ['{"session_id":"one","conversation_id":"two"}', 'conflicting session IDs'],
  ])('rejects %s (%s)', async (input) => {
    await expect(read(input)).rejects.toMatchObject({
      code: 'invalid_hook_input',
      exitCode: 1,
    })
  })
})
