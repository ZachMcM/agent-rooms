import type { Readable } from 'node:stream'

import { CliError } from '../../errors'
import { readHookSessionId } from './input'

export const PROVIDERS = ['claude', 'codex', 'cursor', 'gemini'] as const

export type Provider = (typeof PROVIDERS)[number]

const providers = new Set<string>(PROVIDERS)

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
      'The --provider value must be one of claude, codex, cursor, or gemini.',
      2,
    )
  }

  return provider
}
