export type HookProvider = 'claude' | 'codex' | 'cursor' | 'gemini'

type HookOutput = Record<string, unknown>

const knownProviders = new Set<HookProvider>(['claude', 'codex', 'cursor', 'gemini'])

export function serializeHookContext({
  agent,
  event,
  context,
}: {
  agent: string
  event?: string
  context?: string
}): string | undefined {
  if (!context) {
    return isHookProvider(agent) ? '{}\n' : undefined
  }

  if (!isHookProvider(agent)) {
    return `${context}\n`
  }

  const output = providerOutput(agent, event, context)
  return `${JSON.stringify(output)}\n`
}

export function conversationIdContext(conversationId: string): string {
  return `<conversation-id>${escapeXml(conversationId)}</conversation-id>`
}

export function messagesContext(roomMessages: unknown): string {
  return `<new-messages>${escapeXml(JSON.stringify(roomMessages))}</new-messages>`
}

function providerOutput(
  provider: HookProvider,
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

  if (provider === 'gemini' && event === 'AfterAgent') {
    return { decision: 'deny', reason: context }
  }

  return { hookSpecificOutput: { additionalContext: context } }
}

function isHookProvider(agent: string): agent is HookProvider {
  return knownProviders.has(agent as HookProvider)
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
