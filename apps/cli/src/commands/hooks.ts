import type { Command } from 'commander'

import { resolveConversationId } from '../hooks/conversation-id'

export function addHookCommands(program: Command): void {
  const hook = program
    .command('hook')
    .description('Commands invoked by agent lifecycle hooks.')
    .exitOverride()

  addLogConversationIdCommand(hook)
}

function addLogConversationIdCommand(hook: Command): void {
  hook
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
