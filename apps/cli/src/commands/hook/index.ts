import { Command } from 'commander'

import { preToolUseCommand } from './pre-tool-use'
import { userPromptSubmitCommand } from './user-prompt-submit'

// Hooks are subcommands, not loose script files: no separate build step, shared db layer and
// error handling, and debuggable by piping a saved payload into them from a terminal.
export function hookCommand(): Command {
  return new Command('hook')
    .description('Command hook entry points')
    .addCommand(preToolUseCommand())
    .addCommand(userPromptSubmitCommand())
}
