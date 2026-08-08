import { Command } from 'commander'

import { preToolUseInputSchema } from '../../hooks/events'
import { readHookPayload } from './stdin'

// Two jobs, one hook. Matched to our own MCP tools it injects session_id into the tool call
// params via `updatedInput`; matched to the edit tools it drains decisions that landed mid-turn
// via `additionalContext`, so the agent can reconcile immediately after the write.
export function preToolUseCommand(): Command {
  return new Command('pre-tool-use')
    .description('PreToolUse hook: inject session_id, and drain mid-turn decisions before edits')
    .action(async () => {
      const _payload = await readHookPayload(preToolUseInputSchema)
      // TODO: branch on _payload.tool_name — MCP tools get updatedInput carrying session_id,
      // edit tools get additionalContext from an atomic read-and-advance of the cursor.
      throw new Error('not implemented')
    })
}
