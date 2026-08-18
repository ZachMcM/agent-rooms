import { consumeNewMessages } from '@agent-rooms/db'
import type { Command } from 'commander'

import { openDatabase } from '../../database'
import { resolveHookConversation } from './conversation-id'
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
    .option('--event <name>')
    .exitOverride()
    .action(async (options: { provider: string; event?: string }) => {
      const conversation = await resolveHookConversation({
        provider: options.provider,
        stream: process.stdin,
      })
      const db = await openDatabase()
      const roomMessages = await consumeNewMessages(db, {
        conversationId: conversation.conversationId,
      })

      const output = serializeHookContext({
        provider: conversation.provider,
        event: options.event,
        context:
          roomMessages && roomMessages.messages.length > 0
            ? messagesContext(roomMessages)
            : undefined,
      })

      process.stdout.write(output)
    })
}

function addLogConversationIdCommand(hooks: Command): void {
  hooks
    .command('log-conversation-id')
    .description('Writes the normalized conversation ID into agent context.')
    .requiredOption('--provider <provider>', 'Hook transport provider (claude, codex, or cursor)')
    .option('--event <name>')
    .exitOverride()
    .action(async (options: { provider: string; event?: string }) => {
      const conversation = await resolveHookConversation({
        provider: options.provider,
        stream: process.stdin,
      })

      const output = serializeHookContext({
        provider: conversation.provider,
        event: options.event,
        context: conversationIdContext(conversation.conversationId),
      })

      process.stdout.write(output)
    })
}
