import { describe, expect, it } from 'vitest'

import { PROVIDERS, type Provider } from './conversation-id'
import { conversationIdContext, messagesContext, serializeHookContext } from './output'

describe('hook output', () => {
  it('escapes untrusted peer-message JSON inside XML', () => {
    expect(messagesContext({ messages: [{ body: '<unsafe>&' }] })).toBe(
      '<new-messages>{"messages":[{"body":"&lt;unsafe&gt;&amp;"}]}</new-messages>',
    )
  })

  it.each<[Provider, string, string]>([
    [
      'claude',
      'UserPromptSubmit',
      '{"hookSpecificOutput":{"additionalContext":"<conversation-id>claude-session</conversation-id>"}}\n',
    ],
    [
      'codex',
      'Stop',
      '{"decision":"block","reason":"<conversation-id>codex-session</conversation-id>"}\n',
    ],
    [
      'cursor',
      'postToolUse',
      '{"additional_context":"<conversation-id>cursor-session</conversation-id>"}\n',
    ],
    [
      'cursor',
      'stop',
      '{"followup_message":"<conversation-id>cursor-session</conversation-id>"}\n',
    ],
  ])('serializes %s %s output', (provider, event, expected) => {
    expect(
      serializeHookContext({
        provider,
        event,
        context: conversationIdContext(`${provider}-session`),
      }),
    ).toBe(expected)
  })

  it.each(PROVIDERS)('emits an empty object for %s', (provider) => {
    expect(serializeHookContext({ provider })).toBe('{}\n')
  })

  it('escapes the conversation ID in context', () => {
    expect(conversationIdContext('session<&>')).toBe(
      '<conversation-id>session&lt;&amp;&gt;</conversation-id>',
    )
  })
})
