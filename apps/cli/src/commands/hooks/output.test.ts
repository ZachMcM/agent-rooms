import { describe, expect, it } from 'vitest'

import { conversationIdContext, messagesContext, serializeHookContext } from './output'

describe('hook output', () => {
  it('escapes untrusted peer-message JSON inside XML', () => {
    expect(messagesContext({ messages: [{ body: '<unsafe>&' }] })).toBe(
      '<new-messages>{"messages":[{"body":"&lt;unsafe&gt;&amp;"}]}</new-messages>',
    )
  })

  it.each([
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
    [
      'gemini',
      'AfterAgent',
      '{"decision":"deny","reason":"<conversation-id>gemini-session</conversation-id>"}\n',
    ],
  ])('serializes %s %s output', (agent, event, expected) => {
    expect(
      serializeHookContext({ agent, event, context: conversationIdContext(`${agent}-session`) }),
    ).toBe(expected)
  })

  it.each(['claude', 'codex', 'cursor', 'gemini'])('emits an empty object for %s', (agent) => {
    expect(serializeHookContext({ agent })).toBe('{}\n')
  })

  it('preserves markup output for manual providers', () => {
    expect(
      serializeHookContext({
        agent: 'manual-agent',
        context: '<conversation-id>manual</conversation-id>',
      }),
    ).toBe('<conversation-id>manual</conversation-id>\n')
  })
})
