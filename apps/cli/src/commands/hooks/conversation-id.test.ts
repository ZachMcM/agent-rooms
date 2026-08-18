import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { resolveHookConversation } from './conversation-id'

function resolve(provider: string, input: string) {
  return resolveHookConversation({ provider, stream: Readable.from([input]) })
}

describe('resolveHookConversation', () => {
  it('uses the provider for the conversation prefix', async () => {
    await expect(resolve('claude', '{"session_id":"session:123"}')).resolves.toEqual({
      provider: 'claude',
      conversationId: 'claude-session:123',
    })
  })

  it('keeps provider-prefixed conversation continuity', async () => {
    await expect(
      resolve('codex', '{"session_id":"  codex:abc-123-with-hyphens  "}'),
    ).resolves.toMatchObject({
      conversationId: 'codex-codex:abc-123-with-hyphens',
    })
  })

  it.each(['', 'Claude', 'opencode', 'claude-code', ' claude'])(
    'rejects provider %s',
    async (provider) => {
      await expect(resolve(provider, '')).rejects.toMatchObject({
        code: 'invalid_arguments',
        exitCode: 2,
        message: 'The --provider value must be one of claude, codex, or cursor.',
      })
    },
  )

  it('propagates invalid hook input', async () => {
    await expect(resolve('codex', 'not json')).rejects.toMatchObject({
      code: 'invalid_hook_input',
      exitCode: 1,
    })
  })
})
