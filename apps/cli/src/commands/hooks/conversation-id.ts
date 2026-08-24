import type { Readable } from 'node:stream'

import { CliError } from '../../errors'
import { readHookSessionId } from './input'

export const PROVIDERS = ['claude', 'codex', 'cursor', 'opencode'] as const

export type Provider = (typeof PROVIDERS)[number]

const providers = new Set<string>(PROVIDERS)

const providerEvents = {
  claude: ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'],
  codex: ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'],
  cursor: ['sessionStart', 'postToolUse', 'stop'],
  opencode: [
    'session.created',
    'session.updated',
    'session.compacted',
    'session.idle',
    'chat.message',
    'tool.execute.after',
  ],
} as const satisfies Record<Provider, readonly string[]>

export function isProvider(value: string): value is Provider {
  return providers.has(value)
}

export interface HookConversation {
  provider: Provider
  conversationId: string
}

export async function resolveHookConversation({
  provider,
  stream,
}: {
  provider: string
  stream: Readable
}): Promise<HookConversation> {
  const hookProvider = parseHookProvider(provider)
  return {
    provider: hookProvider,
    conversationId: `${hookProvider}-${await readHookSessionId(stream)}`,
  }
}

export function parseHookProvider(provider: string): Provider {
  if (!isProvider(provider)) {
    throw new CliError(
      'invalid_arguments',
      'The --provider value must be one of claude, codex, cursor, or opencode.',
      2,
    )
  }

  return provider
}

export function parseHookEvent(provider: Provider, event: string): string {
  const events: readonly string[] = providerEvents[provider]

  if (!events.includes(event)) {
    throw new CliError(
      'invalid_arguments',
      `The --event value must be one of ${events.join(', ')} for ${provider}.`,
      2,
    )
  }

  return event
}
