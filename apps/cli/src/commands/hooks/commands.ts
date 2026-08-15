import { consumeNewMessages } from '@agent-rooms/db'
import type { Command } from 'commander'

import { openDatabase } from '../../database'
import { resolveConversationId } from './conversation-id'

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
    .requiredOption('--agent <name>')
    .exitOverride()
    .action(async (options: { agent: string }) => {
      const conversationId = await resolveConversationId({
        agent: options.agent,
        stream: process.stdin,
      })
      const db = await openDatabase()
      const roomMessages = await consumeNewMessages(db, { conversationId })

      if (roomMessages !== undefined) {
        process.stdout.write(`<new-messages>${JSON.stringify(roomMessages)}</new-messages>\n`)
      }
    })
}

function addLogConversationIdCommand(hooks: Command): void {
  hooks
    .command('log-conversation-id')
    .description('Writes the normalized conversation ID into agent context.')
    .requiredOption('--agent <name>')
    .exitOverride()
    .action(async (options: { agent: string }) => {
      const conversationId = await resolveConversationId({
        agent: options.agent,
        stream: process.stdin,
      })

      process.stdout.write(`<conversation-id>${conversationId}</conversation-id>\n`)
    })
}
