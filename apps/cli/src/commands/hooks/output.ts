import type { Provider } from './conversation-id'

type HookOutput = Record<string, unknown>

export function serializeHookContext({
  provider,
  event,
  context,
}: {
  provider: Provider
  event?: string
  context?: string
}): string {
  if (!context) {
    return '{}\n'
  }

  const output = providerOutput(provider, event, context)
  return `${JSON.stringify(output)}\n`
}

export function conversationIdContext(conversationId: string): string {
  return `<conversation-id>${escapeXml(conversationId)}</conversation-id>`
}

export function messagesContext(roomMessages: unknown): string {
  return `<new-messages>${escapeXml(JSON.stringify(roomMessages))}</new-messages>`
}

function providerOutput(
  provider: Provider,
  event: string | undefined,
  context: string,
): HookOutput {
  if (provider === 'cursor') {
    if (event === 'stop') {
      return { followup_message: context }
    }

    return { additional_context: context }
  }

  if (provider === 'codex' && event === 'Stop') {
    return { decision: 'block', reason: context }
  }

  if (provider === 'codex') {
    return { hookSpecificOutput: { hookEventName: event, additionalContext: context } }
  }

  return { hookSpecificOutput: { additionalContext: context } }
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
