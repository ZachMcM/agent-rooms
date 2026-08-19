import { consumeNewMessages } from '@agent-rooms/db'
import type { Command } from 'commander'

import { openDatabase } from '../../database'
import { parseHookEvent, parseHookProvider, resolveHookConversation } from './conversation-id'
import { conversationIdContext, messagesContext, serializeHookContext } from './output'

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
    .requiredOption('--provider <provider>', 'Hook transport provider (claude, codex, or cursor)')
    .requiredOption('--event <name>')
    .option('--include-conversation-id', 'Writes the conversation ID before unread messages.')
    .exitOverride()
    .action(
      async (options: { provider: string; event: string; includeConversationId?: boolean }) => {
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

        const output = serializeHookContext({
          provider: conversation.provider,
          event,
          context: contexts.join('\n'),
        })

        process.stdout.write(output)
      },
    )
}

function addLogConversationIdCommand(hooks: Command): void {
  hooks
    .command('log-conversation-id')
    .description('Writes the normalized conversation ID into agent context.')
    .requiredOption('--provider <provider>', 'Hook transport provider (claude, codex, or cursor)')
    .requiredOption('--event <name>')
    .exitOverride()
    .action(async (options: { provider: string; event: string }) => {
      const provider = parseHookProvider(options.provider)
      const event = parseHookEvent(provider, options.event)
      const conversation = await resolveHookConversation({
        provider,
        stream: process.stdin,
      })

      const output = serializeHookContext({
        provider: conversation.provider,
        event,
        context: conversationIdContext(conversation.conversationId),
      })

      process.stdout.write(output)
    })
}
