import { Command } from 'commander'

import { addCreateRoomCommand, addJoinRoomCommand } from './commands/rooms'
import { handleCliError } from './errors'
import { packageVersion } from './paths'

export function createProgram(): Command {
  const program = new Command('agent-rooms')
    .description('Pseudo-real-time decision sharing between parallel coding agents.')
    .version(packageVersion())
    .configureOutput({
      writeOut: (message) => process.stdout.write(message),
      writeErr: () => {},
    })
    .exitOverride()

  addCreateRoomCommand(program)
  addJoinRoomCommand(program)

  return program
}

export async function runCli(argv: string[]): Promise<number> {
  try {
    await createProgram().parseAsync(argv, { from: 'user' })
    return 0
  } catch (error) {
    return handleCliError(error)
  }
}
