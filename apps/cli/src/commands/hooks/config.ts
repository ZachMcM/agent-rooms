import { homedir } from 'node:os'
import { join } from 'node:path'

import type { Provider } from './conversation-id'

export const hookExecutable = join(homedir(), '.coordrooms', 'bin', 'coordrooms')

export function providerHookConfig(executable: string = hookExecutable): Record<string, unknown> {
  const identity = (provider: Provider, event: string) =>
    hookCommand(executable, 'log-conversation-id', provider, event)
  const delivery = (provider: Provider, event: string, includeConversationId = false) =>
    hookCommand(executable, 'consume-new-messages', provider, event, includeConversationId)

  return {
    claude: {
      hooks: {
        SessionStart: [
          claudeEntry('startup|resume|clear', identity('claude', 'SessionStart')),
          claudeEntry('compact', delivery('claude', 'SessionStart', true)),
        ],
        UserPromptSubmit: [claudeEntry(undefined, delivery('claude', 'UserPromptSubmit'))],
        PostToolUse: [claudeEntry(undefined, delivery('claude', 'PostToolUse'))],
        Stop: [claudeEntry(undefined, delivery('claude', 'Stop'))],
      },
    },
    codex: {
      hooks: {
        SessionStart: [
          codexEntry('startup|resume|clear', identity('codex', 'SessionStart')),
          codexEntry('compact', delivery('codex', 'SessionStart', true)),
        ],
        UserPromptSubmit: [codexEntry(undefined, delivery('codex', 'UserPromptSubmit'))],
        PostToolUse: [codexEntry(undefined, delivery('codex', 'PostToolUse'))],
        Stop: [codexEntry(undefined, delivery('codex', 'Stop'))],
      },
    },
    cursor: {
      hooks: {
        sessionStart: [cursorEntry(identity('cursor', 'sessionStart'))],
        postToolUse: [cursorEntry(delivery('cursor', 'postToolUse'))],
        stop: [cursorEntry(delivery('cursor', 'stop'))],
      },
    },
  }
}

function hookCommand(
  executable: string,
  command: 'log-conversation-id' | 'consume-new-messages',
  provider: Provider,
  event: string,
  includeConversationId = false,
): string {
  return `${shellQuote(executable)} hooks ${command} --provider ${provider} --event ${event}${includeConversationId ? ' --include-conversation-id' : ''}`
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : `'${value.replaceAll("'", `'"'"'`)}'`
}

function claudeEntry(
  matcher: string | undefined,
  command: string | string[],
): Record<string, unknown> {
  return {
    ...(matcher ? { matcher } : {}),
    hooks: (Array.isArray(command) ? command : [command]).map((command) => ({
      type: 'command',
      command,
    })),
  }
}

function codexEntry(
  matcher: string | undefined,
  command: string | string[],
): Record<string, unknown> {
  return {
    ...(matcher ? { matcher } : {}),
    hooks: (Array.isArray(command) ? command : [command]).map((command) => ({
      type: 'command',
      command,
    })),
  }
}

function cursorEntry(command: string): Record<string, unknown> {
  return { command }
}
