import type { Command } from 'commander'

import { resolveConversationId } from './conversation-id'

export function addHooksCommand(program: Command): void {
  const hooks = program
    .command('hooks')
    .description('Commands invoked by agent lifecycle hooks.')
    .exitOverride()

  addLogConversationIdCommand(hooks)
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
