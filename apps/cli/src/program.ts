import { createRequire } from 'node:module'

import { Command } from 'commander'

import { addDashboardCommand } from './commands/dashboard'
import { addHooksCommand } from './commands/hooks'
import { addInstallCommand } from './commands/install'
import { addListRoomMessagesCommand, addWriteMessagesCommand } from './commands/messages'
import {
  addCreateRoomCommand,
  addJoinRoomCommand,
  addLeaveRoomCommand,
  addListActiveRoomsCommand,
} from './commands/rooms'
import { handleCliError } from './errors'
import { runMcpServer } from './mcp'

const require = createRequire(import.meta.url)
const packageVersion = (require('../package.json') as { version: string }).version

export function createProgram(): Command {
  const program = new Command('agent-rooms')
    .description('Real-time decision sharing between parallel coding agents.')
    .version(packageVersion)
    .configureOutput({
      writeOut: (message) => process.stdout.write(message),
      writeErr: () => {},
    })
    .exitOverride()

  addCreateRoomCommand(program)
  addJoinRoomCommand(program)
  addListActiveRoomsCommand(program)
  addListRoomMessagesCommand(program)
  addWriteMessagesCommand(program)
  addLeaveRoomCommand(program)
  addHooksCommand(program)
  addDashboardCommand(program)
  addInstallCommand(program, packageVersion)
  program
    .command('mcp')
    .description('Runs the Agent Rooms stdio MCP server.')
    .action(async () => runMcpServer())

  return program
}

export async function runCli(argv: string[]): Promise<number> {
  const human = (argv[0] === 'install' || argv[0] === 'uninstall') && !argv.includes('--json')
  try {
    await createProgram().parseAsync(argv, { from: 'user' })
    return 0
  } catch (error) {
    return handleCliError(error, human)
  }
}
