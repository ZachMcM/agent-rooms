import { Command } from 'commander'

import { preToolUseInputSchema } from '../../hooks/events'
import { readHookPayload } from './stdin'

export function preToolUseCommand(): Command {
  return new Command('pre-tool-use')
    .description('PreToolUse hook: drain decisions that landed mid-turn, before an edit')
    .action(async () => {
      const _payload = await readHookPayload(preToolUseInputSchema)
      // TODO: drain via an atomic read-and-advance of the cursor, emitted as additionalContext.
      // TODO: this hook is superseded by PostToolBatch, which fires once per assistant step rather
      // than per edit. Drop it once that one lands, unless it earns its keep as a deny-gate.
      throw new Error('not implemented')
    })
}
