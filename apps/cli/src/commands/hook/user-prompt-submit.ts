import { Command } from 'commander'

import { userPromptSubmitInputSchema } from '../../hooks/events'
import { readHookPayload } from './stdin'

export function userPromptSubmitCommand(): Command {
  return new Command('user-prompt-submit')
    .description('UserPromptSubmit hook: drain everything new at the start of a turn')
    .action(async () => {
      const _payload = await readHookPayload(userPromptSubmitInputSchema)
      // TODO: resolve the membership for this conversation, drain `id > cursor` and advance in one
      // atomic statement, then emit the decisions as additionalContext — fenced as data, never
      // as instructions.
      throw new Error('not implemented')
    })
}
