import type { Command } from 'commander'

import { CliError } from '../errors'
import { runInstall, runUninstall } from '../installer/transaction'
import { writeSuccess } from '../output'

export function addInstallCommand(program: Command, version?: string): void {
  program
    .command('install')
    .description('Installs the managed Agent Rooms runtime and integrations.')
    .option('--yes')
    .option('--dry-run')
    .exitOverride()
    .action(async (options: { yes?: boolean; dryRun?: boolean }) => {
      try {
        writeSuccess(
          await runInstall({
            version: version ?? '0.0.0',
            yes: options.yes,
            dryRun: options.dryRun,
          }),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Installation failed.'
        throw new CliError(
          message.startsWith('Installation partially completed:')
            ? 'partial_install'
            : 'install_failed',
          message,
          1,
        )
      }
    })
  program
    .command('uninstall')
    .description('Removes Agent Rooms integrations and managed runtime files.')
    .option('--yes')
    .option('--purge-data')
    .exitOverride()
    .action(async (options: { yes?: boolean; purgeData?: boolean }) => {
      try {
        writeSuccess(await runUninstall({ yes: options.yes, purgeData: options.purgeData }))
      } catch (error) {
        throw new CliError(
          'uninstall_failed',
          error instanceof Error ? error.message : 'Uninstall failed.',
          1,
        )
      }
    })
}
