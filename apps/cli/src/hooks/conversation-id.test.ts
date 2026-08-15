import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { resolveConversationId } from './conversation-id'

function resolve(agent: string, input: string): Promise<string> {
  return resolveConversationId({ agent, stream: Readable.from([input]) })
}

describe('resolveConversationId', () => {
  it('returns the exact conversation ID', async () => {
    await expect(resolve('codex', '{"session_id":"session:123"}')).resolves.toBe(
      'codex-session:123',
    )
  })

  it('trims agent and session ID', async () => {
    await expect(resolve('  claude-code  ', '{"session_id":"  codex:abc_123  "}')).resolves.toBe(
      'claude-code-codex:abc_123',
    )
  })

  it.each(['', 'Claude-code', 'claude_code', '-claude', 'claude-', 'claude--code'])(
    'rejects invalid agent slug %s',
    async (agent) => {
      await expect(resolve(agent, '{"session_id":"session:123"}')).rejects.toMatchObject(
        expect.objectContaining({
          code: 'invalid_arguments',
          exitCode: 2,
        }),
      )
    },
  )

  it('propagates invalid hook input', async () => {
    await expect(resolve('codex', 'not json')).rejects.toMatchObject({
      code: 'invalid_hook_input',
      exitCode: 1,
    })
  })
})
