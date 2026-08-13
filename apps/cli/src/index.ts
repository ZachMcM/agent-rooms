import { Command } from 'commander'

import { packageVersion } from './paths'

const program = new Command('agent-rooms')
  .description('Pseudo-real-time decision sharing between parallel coding agents.')
  .version(packageVersion())

await program.parseAsync(process.argv)
