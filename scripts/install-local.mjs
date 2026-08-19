import { spawn } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ora from 'ora'
import pc from 'picocolors'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function complete(message) {
  const color = process.stderr.isTTY && !process.env.NO_COLOR && !process.env.CI
  process.stderr.write(`${pc.createColors(color).green('✔')} ${message}\n`)
}

export function spinnerOptions(enabled) {
  return {
    color: 'cyan',
    discardStdin: false,
    isEnabled: enabled,
    spinner: 'dots',
    stream: process.stderr,
  }
}

export function run(command, arguments_, { cwd = root, label, inherit = false } = {}) {
  const enabled =
    process.stdout.isTTY === true &&
    process.stderr.isTTY === true &&
    !process.env.NO_COLOR &&
    !process.env.CI
  const spinner = label ? ora(spinnerOptions(enabled)).start(label) : undefined
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, arguments_, { cwd, stdio: inherit ? 'inherit' : 'pipe' })
    const stdout = []
    const stderr = []
    child.stdout?.on('data', (chunk) => stdout.push(String(chunk)))
    child.stderr?.on('data', (chunk) => stderr.push(String(chunk)))
    child.once('error', (error) => {
      spinner?.stop()
      reject(new Error(`failed to start ${command}: ${error.message}`))
    })
    child.once('exit', (status) => {
      spinner?.stop()
      if (status !== 0) {
        const output = [...stdout, ...stderr].join('').trim()
        reject(
          new Error(
            `${command} failed with exit code ${status ?? 'unknown'}${output ? `\n${output}` : ''}`,
          ),
        )
        return
      }
      if (label) complete(label)
      resolveRun()
    })
  })
}

export function forwardedInstallArguments(arguments_) {
  const forwarded = arguments_[0] === '--' ? arguments_.slice(1) : [...arguments_]
  if (forwarded.some((argument) => argument === '--package' || argument.startsWith('--package='))) {
    throw new Error('install:local controls --package; remove the forwarded --package option.')
  }
  return forwarded
}

export async function main(arguments_ = process.argv.slice(2)) {
  const forwardedArguments = forwardedInstallArguments(arguments_)
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'agent-rooms-'))

  try {
    await run('pnpm', ['exec', 'turbo', 'run', 'build', '--filter=agent-rooms'], {
      label: 'Building Agent Rooms...',
    })
    await run(
      'pnpm',
      ['--filter', 'agent-rooms', 'pack', '--pack-destination', temporaryDirectory],
      {
        label: 'Packing Agent Rooms...',
      },
    )

    const tarballs = (await readdir(temporaryDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
      .map((entry) => resolve(temporaryDirectory, entry.name))

    if (tarballs.length !== 1) {
      throw new Error(`expected one package tarball, found ${tarballs.length}`)
    }

    await run(
      'npm',
      [
        'exec',
        '--yes',
        '--package',
        tarballs[0],
        '--',
        'agent-rooms',
        'install',
        '--package',
        tarballs[0],
        ...forwardedArguments,
      ],
      { cwd: temporaryDirectory, inherit: true },
    )
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
