import { consumeNewMessages } from '@agent-rooms/db'
import type { Command } from 'commander'

import { openDatabase } from '../../database'
import { parseHookEvent, parseHookProvider, resolveHookConversation } from './conversation-id'
import {
  conversationIdContext,
  messagesContext,
  plainHookContext,
  serializeHookContext,
} from './output'

export function addHooksCommand(program: Command): void {
  const hooks = program
    .command('hooks')
    .description('Commands invoked by agent lifecycle hooks.')
    .exitOverride()

  addLogConversationIdCommand(hooks)
  addConsumeNewMessagesCommand(hooks)
}

function addConsumeNewMessagesCommand(hooks: Command): void {
  hooks
    .command('consume-new-messages')
    .description('Writes unread messages from the active room into agent context.')
    .requiredOption(
      '--provider <provider>',
      'Hook transport provider (claude, codex, cursor, or opencode)',
    )
    .requiredOption('--event <name>')
    .option('--include-conversation-id', 'Writes the conversation ID before unread messages.')
    .option('--plain', 'Writes the bare context instead of the hook transport envelope.')
    .exitOverride()
    .action(
      async (options: {
        provider: string
        event: string
        includeConversationId?: boolean
        plain?: boolean
      }) => {
        const provider = parseHookProvider(options.provider)
        const event = parseHookEvent(provider, options.event)
        const conversation = await resolveHookConversation({
          provider,
          stream: process.stdin,
        })
        const db = await openDatabase()
        const roomMessages = await consumeNewMessages(db, {
          conversationId: conversation.conversationId,
        })

        const contexts = options.includeConversationId
          ? [conversationIdContext(conversation.conversationId)]
          : []

        if (roomMessages && roomMessages.messages.length > 0) {
          contexts.push(messagesContext(roomMessages))
        }

        process.stdout.write(
          options.plain
            ? plainHookContext(contexts.join('\n'))
            : serializeHookContext({
                provider: conversation.provider,
                event,
                context: contexts.join('\n'),
              }),
        )
      },
    )
}

function addLogConversationIdCommand(hooks: Command): void {
  hooks
    .command('log-conversation-id')
    .description('Writes the normalized conversation ID into agent context.')
    .requiredOption(
      '--provider <provider>',
      'Hook transport provider (claude, codex, cursor, or opencode)',
    )
    .requiredOption('--event <name>')
    .option('--plain', 'Writes the bare context instead of the hook transport envelope.')
    .exitOverride()
    .action(async (options: { provider: string; event: string; plain?: boolean }) => {
      const provider = parseHookProvider(options.provider)
      const event = parseHookEvent(provider, options.event)
      const conversation = await resolveHookConversation({
        provider,
        stream: process.stdin,
      })

      const context = conversationIdContext(conversation.conversationId)
      process.stdout.write(
        options.plain
          ? plainHookContext(context)
          : serializeHookContext({
              provider: conversation.provider,
              event,
              context,
            }),
      )
    })
}
