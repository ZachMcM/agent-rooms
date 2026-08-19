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
  const enabled =
    process.stdout.isTTY === true &&
    process.stderr.isTTY === true &&
    !process.env.NO_COLOR &&
    !process.env.CI
  const colors = pc.createColors(enabled)
  const spinner = ora({
    color: 'cyan',
    discardStdin: false,
    isEnabled: enabled,
    spinner: 'dots',
    stream: process.stderr,
  })
  let text = ''

  function status(message: string): void {
    process.stdout.write(`${colors.green('✔')} ${message}\n`)
  }

  function warning(message: string): void {
    process.stderr.write(`${enabled ? colors.yellow('!') : 'Warning:'} ${message}\n`)
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
      } else {
        status(`Installed Agent Rooms ${result.version}.`)
        const profile = result.changes.find((change) => change.action === 'add PATH block')?.path
        if (profile) {
          status(`Updated ${profile}.`)
          process.stdout.write(
            `Run source ${shellQuote(profile)} to use agent-rooms in this terminal, or open a new terminal.\n`,
          )
        }
      }
      for (const message of result.warnings) warning(message)
    },
    uninstall(result, purgeData) {
      spinner.stop()
      status('Removed Agent Rooms runtime and integrations.')
      process.stdout.write(
        `${purgeData ? 'Removed Agent Rooms data.' : 'Kept Agent Rooms data.'}\n`,
      )
      for (const message of result.warnings) warning(message)
    },
  }
}
