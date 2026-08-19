import ora from 'ora'
import pc from 'picocolors'

import type { InstallResult, UninstallResult } from './transaction'

type Presenter = {
  start: (text: string) => void
  stop: () => void
  resume: () => void
  install: (result: InstallResult, dryRun: boolean) => void
  uninstall: (result: UninstallResult, purgeData: boolean) => void
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

export function createInstallerPresenter(): Presenter {
  const interactive =
    process.stdout.isTTY === true && process.stderr.isTTY === true && !process.env.CI
  const colors = pc.createColors(
    interactive && !process.env.NO_COLOR && process.env.TERM !== 'dumb',
  )
  const spinner = ora({
    color: colors.isColorSupported ? 'cyan' : false,
    discardStdin: false,
    isEnabled: interactive,
    spinner: 'dots',
    stream: process.stderr,
  })
  let text = ''

  function status(message: string): void {
    process.stdout.write(`${colors.green('✔')} ${message}\n`)
  }

  function warning(message: string): void {
    process.stderr.write(`${interactive ? colors.yellow('!') : 'Warning:'} ${message}\n`)
  }

  return {
    start(message) {
      text = message
      spinner.start(message)
    },
    stop() {
      spinner.stop()
    },
    resume() {
      if (text) spinner.start(text)
    },
    install(result, dryRun) {
      spinner.stop()
      if (dryRun) {
        status(`Previewed ${result.changes.length} changes; no files were modified.`)
        for (const change of result.changes)
          process.stdout.write(`  - ${change.action}: ${change.path}\n`)
      } else {
        status(`Installed Agent Rooms ${result.version}.`)
        const profile = result.changes.find((change) => change.action === 'add PATH block')?.path
        if (profile) {
          status(`Updated ${profile}.`)
          process.stdout.write(
            `Run source ${shellQuote(profile)} to use agent-rooms in this terminal, or open a new terminal.\n`,
          )
        } else {
          process.stdout.write('Agent Rooms is ready to use.\n')
        }
      }
      if (result.warnings.length)
        process.stdout.write(
          `Completed with ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}.\n`,
        )
      for (const message of result.warnings) warning(message)
    },
    uninstall(result, purgeData) {
      spinner.stop()
      status(`Removed ${result.changes.length} managed changes.`)
      process.stdout.write(
        `${purgeData ? 'Removed Agent Rooms data.' : 'Kept Agent Rooms data.'}\n`,
      )
      if (!purgeData)
        process.stdout.write('To remove it later, run agent-rooms uninstall --yes --purge-data.\n')
      if (result.warnings.length)
        process.stdout.write(
          `Completed with ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}.\n`,
        )
      for (const message of result.warnings) warning(message)
    },
  }
}
