import type { Command } from 'commander'

import { CliError } from '../errors'
import { createInstallerPresenter } from '../installer/presenter'
import { runInstall, runUninstall } from '../installer/transaction'
import { writeSuccess } from '../output'

export function addInstallCommand(program: Command, version?: string): void {
  program
    .command('install')
    .description('Installs the managed CoordRooms runtime and integrations.')
    .option('--yes')
    .option('--dry-run')
    .option('--json', 'Print machine-readable output; requires --yes except with --dry-run.')
    .option('--package <absolute-path.tgz>')
    .exitOverride()
    .action(
      async (options: { yes?: boolean; dryRun?: boolean; package?: string; json?: boolean }) => {
        if (options.json && !options.yes && !options.dryRun)
          throw new CliError(
            'invalid_arguments',
            '--json requires --yes unless used with --dry-run.',
            2,
          )
        const presenter = options.json ? undefined : createInstallerPresenter()
        presenter?.start(
          options.dryRun ? 'Preparing installation preview...' : 'Installing CoordRooms...',
        )
        try {
          const result = await runInstall({
            version: version ?? '0.0.0',
            yes: options.yes,
            dryRun: options.dryRun,
            source: options.package,
            beforeConfirm: presenter?.stop,
            afterConfirm: presenter?.resume,
          })
          if (options.json) writeSuccess(result)
          else presenter?.install(result, options.dryRun === true)
        } catch (error) {
          presenter?.stop()
          const message = error instanceof Error ? error.message : 'Installation failed.'
          throw new CliError(
            message.startsWith('Installation partially completed:')
              ? 'partial_install'
              : 'install_failed',
            message,
            1,
            false,
            options.json ? 'json' : 'human',
          )
        }
      },
    )
  program
    .command('uninstall')
    .description('Removes CoordRooms integrations and managed runtime files.')
    .option('--yes')
    .option('--purge-data')
    .option('--json', 'Print machine-readable output; requires --yes.')
    .exitOverride()
    .action(async (options: { yes?: boolean; purgeData?: boolean; json?: boolean }) => {
      if (options.json && !options.yes)
        throw new CliError('invalid_arguments', '--json requires --yes.', 2)
      const presenter = options.json ? undefined : createInstallerPresenter()
      presenter?.start('Uninstalling CoordRooms...')
      try {
        const result = await runUninstall({
          yes: options.yes,
          purgeData: options.purgeData,
          beforeConfirm: presenter?.stop,
          afterConfirm: presenter?.resume,
        })
        if (options.json) writeSuccess(result)
        else presenter?.uninstall(result, options.purgeData === true)
      } catch (error) {
        presenter?.stop()
        throw new CliError(
          'uninstall_failed',
          error instanceof Error ? error.message : 'Uninstall failed.',
          1,
          false,
          options.json ? 'json' : 'human',
        )
      }
    })
}
