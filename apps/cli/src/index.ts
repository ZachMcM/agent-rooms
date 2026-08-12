import { Command } from 'commander'

import { hookCommand } from './commands/hook'
import { installCommand } from './commands/install'
import { webCommand } from './commands/web'
import { packageVersion } from './paths'

const program = new Command('agent-rooms')
  .description('Pseudo-real-time decision sharing between parallel coding agents.')
  .version(packageVersion())
  .addCommand(installCommand())
  .addCommand(webCommand())
  .addCommand(hookCommand())

await program.parseAsync(process.argv)
