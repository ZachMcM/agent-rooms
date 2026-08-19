import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { cwd: root, stdio: 'inherit' })

  if (result.error) {
    throw new Error(`failed to start ${command}: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}`)
  }
}

export function forwardedInstallArguments(arguments_) {
  const forwarded = arguments_[0] === '--' ? arguments_.slice(1) : [...arguments_]
  if (forwarded.some((argument) => argument === '--package' || argument.startsWith('--package='))) {
    throw new Error('install:local controls --package; remove the forwarded --package option.')
  }
  return forwarded
}

export function completionMessage(arguments_, cliPackage, homeDirectory) {
  if (arguments_.includes('--help') || arguments_.includes('-h')) return undefined
  if (arguments_.includes('--dry-run')) {
    return `Previewed managed ${cliPackage.name}@${cliPackage.version}; no changes were installed.`
  }
  return `Installed managed ${cliPackage.name}@${cliPackage.version}. Start a new shell and run agent-rooms --help, or run ${join(homeDirectory, '.agent-rooms', 'bin', 'agent-rooms')} --help now.`
}

export async function main(arguments_ = process.argv.slice(2)) {
  const forwardedArguments = forwardedInstallArguments(arguments_)
  const cliPackage = JSON.parse(await readFile(resolve(root, 'apps/cli/package.json'), 'utf8'))
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'agent-rooms-'))

  try {
    run('pnpm', ['exec', 'turbo', 'run', 'build', '--filter=agent-rooms'])
    run('pnpm', ['--filter', 'agent-rooms', 'pack', '--pack-destination', temporaryDirectory])

    const tarballs = (await readdir(temporaryDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
      .map((entry) => resolve(temporaryDirectory, entry.name))

    if (tarballs.length !== 1) {
      throw new Error(`expected one package tarball, found ${tarballs.length}`)
    }

    run('npm', [
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
    ])
    const message = completionMessage(forwardedArguments, cliPackage, homedir())
    if (message) console.log(message)
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
