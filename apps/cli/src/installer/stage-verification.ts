import { randomUUID } from 'node:crypto'
import { lstat, readdir, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { assertOwnedPathComponents, assertOwnedRegularFile, readOwnedFile } from './filesystem'

const packageName = 'agent-rooms'

export type Spawn = (
  command: string,
  args: string[],
  options?: { cwd?: string },
) => Promise<SpawnResult | void>

export type SpawnResult = { stdout: string; stderr: string }

export async function verifyRuntimeTree(
  runtimeRoot: string,
  trustedBase: string,
  version: string,
  run: Spawn,
): Promise<string> {
  const packageRoot = stagedPackageRoot(runtimeRoot)
  await assertOwnedPathComponents(packageRoot, trustedBase)
  const packageJsonPath = join(packageRoot, 'package.json')
  await assertOwnedPathComponents(packageJsonPath, trustedBase)
  await assertOwnedRegularFile(packageJsonPath)
  const packageJson = JSON.parse(await readOwnedFile(packageJsonPath, trustedBase)) as {
    name?: unknown
    version?: unknown
    bin?: unknown
  }
  if (
    packageJson.name !== packageName ||
    packageJson.version !== version ||
    !hasBin(packageJson.bin)
  ) {
    throw new Error('Staged package does not match the requested agent-rooms version.')
  }

  const executable = binFile(packageJson.bin)
  const executablePath = resolveContainedPackagePath(packageRoot, executable, 'Package bin')
  await assertOwnedPathComponents(executablePath, trustedBase)
  const executableStat = await lstat(executablePath)
  if (executableStat.isSymbolicLink() || !executableStat.isFile()) {
    throw new Error('Staged package bin must be an owned regular file.')
  }

  await assertLoadableLibsqlClient(runtimeRoot, packageRoot, trustedBase, run)
  await assertMigrationTree(join(packageRoot, 'migrations'), trustedBase)
  await assertNonEmptyFile(
    join(packageRoot, 'assets', 'agent-rooms', 'SKILL.md'),
    trustedBase,
    'agent-rooms skill',
  )
  await assertDashboardAssets(join(packageRoot, 'assets', 'dashboard'), trustedBase)

  const result = await runForOutput(run, 'node', [executablePath, '--version'])
  if (result.stdout !== version && result.stdout !== `${version}\n`) {
    throw new Error(`Staged package --version returned ${JSON.stringify(result.stdout)}.`)
  }
  return relative(packageRoot, executablePath)
}

export function stagedPackageRoot(stage: string): string {
  return join(stage, 'node_modules', packageName)
}

export async function runForOutput(
  run: Spawn,
  command: string,
  args: string[],
  options?: { cwd?: string },
): Promise<SpawnResult> {
  const result = await run(command, args, options)
  if (!result) return { stdout: '', stderr: '' }
  return result
}

function hasBin(value: unknown): value is string | Record<string, string> {
  return (
    typeof value === 'string' ||
    (typeof value === 'object' &&
      value !== null &&
      typeof (value as Record<string, unknown>)['agent-rooms'] === 'string')
  )
}

function binFile(value: string | Record<string, string>): string {
  return typeof value === 'string' ? value : value['agent-rooms']!
}

async function assertLoadableLibsqlClient(
  runtimeRoot: string,
  packageRoot: string,
  trustedBase: string,
  run: Spawn,
): Promise<void> {
  const databasePath = join(packageRoot, `.verify-libsql-${randomUUID()}.sqlite`)
  const artifacts = [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    `${databasePath}-journal`,
  ]
  await assertOwnedPathComponents(packageRoot, trustedBase)
  let result: SpawnResult
  try {
    result = await runForOutput(
      run,
      'node',
      [
        '--input-type=module',
        '--eval',
        'const resolved=import.meta.resolve("@libsql/client");const {createClient}=await import(resolved);const client=createClient({url:process.argv[1]});try{const result=await client.execute("SELECT 1");if(String(result.rows[0]?.[0])!=="1")throw new Error("Unexpected SELECT 1 result");process.stdout.write(resolved)}finally{await client.close()}',
        pathToFileURL(databasePath).href,
      ],
      { cwd: packageRoot },
    )
    await assertOwnedPathComponents(databasePath, trustedBase)
    await assertOwnedRegularFile(databasePath)
    if ((await lstat(databasePath)).size === 0) {
      throw new Error('Staged @libsql/client did not create a file-backed verification database.')
    }
  } finally {
    for (const artifact of artifacts) await removeSmokeArtifact(artifact, trustedBase)
  }
  let loadedPath: string
  try {
    loadedPath = fileURLToPath(result.stdout)
  } catch (error) {
    throw new Error('Staged @libsql/client did not resolve to a local file.', { cause: error })
  }
  const loadedRelative = relative(runtimeRoot, loadedPath)
  resolveContainedPackagePath(runtimeRoot, loadedRelative, 'Staged @libsql/client')
  await assertOwnedPathComponents(loadedPath, trustedBase)
  await assertOwnedRegularFile(loadedPath)
}

async function removeSmokeArtifact(path: string, trustedBase: string): Promise<void> {
  await assertOwnedPathComponents(dirname(path), trustedBase)
  try {
    const pathStat = await lstat(path)
    if (!pathStat.isFile() && !pathStat.isSymbolicLink()) {
      throw new Error(`Refusing to remove unsupported staged verification artifact: ${path}.`)
    }
    if (process.getuid?.() !== undefined && pathStat.uid !== process.getuid?.()) {
      throw new Error(`Refusing to use path not owned by the current user: ${path}.`)
    }
    await assertOwnedPathComponents(dirname(path), trustedBase)
    await unlink(path)
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}

async function assertMigrationTree(path: string, base: string): Promise<void> {
  const files = await scanOwnedNonEmptyFileTree(path, base, {
    directoryMessage: 'Staged package migrations must be an owned directory.',
    symlinkMessage: 'Staged package migrations must not contain symbolic links.',
    fileMessage: 'Staged package migrations must contain only non-empty regular files.',
  })
  if (!files.some((file) => file.endsWith('.sql'))) {
    throw new Error('Staged package migrations must contain a non-empty file.')
  }
}

async function assertDashboardAssets(path: string, base: string): Promise<void> {
  await assertOwnedPathComponents(path, base)
  await assertNonEmptyFile(join(path, 'server', 'index.mjs'), base, 'dashboard server entry')
  const files = await scanOwnedNonEmptyFileTree(join(path, 'public', 'assets'), base, {
    directoryMessage: 'Staged package dashboard public assets must be an owned directory.',
    symlinkMessage: 'Staged package dashboard public assets must not contain symbolic links.',
    fileMessage:
      'Staged package dashboard public assets must contain only non-empty regular files.',
  })
  if (files.length === 0) {
    throw new Error(
      'Staged package dashboard public assets must contain a non-empty owned regular file.',
    )
  }
}

async function scanOwnedNonEmptyFileTree(
  path: string,
  base: string,
  messages: {
    directoryMessage: string
    symlinkMessage: string
    fileMessage: string
  },
): Promise<string[]> {
  await assertOwnedPathComponents(path, base)
  let pathStat
  try {
    pathStat = await lstat(path)
  } catch (error) {
    if (!isNotFound(error)) throw error
    throw new Error(messages.directoryMessage, { cause: error })
  }
  if (pathStat.isSymbolicLink() || !pathStat.isDirectory()) {
    throw new Error(messages.directoryMessage)
  }

  const files: string[] = []
  const pending = [path]
  while (pending.length > 0) {
    const directory = pending.pop()!
    await assertOwnedPathComponents(directory, base)
    for (const entry of await readdir(directory)) {
      const entryPath = join(directory, entry)
      await assertOwnedPathComponents(entryPath, base)
      const entryStat = await lstat(entryPath)
      if (entryStat.isSymbolicLink()) throw new Error(messages.symlinkMessage)
      if (entryStat.isDirectory()) pending.push(entryPath)
      else if (entryStat.isFile() && entryStat.size > 0) files.push(entryPath)
      else throw new Error(messages.fileMessage)
    }
  }
  return files
}

async function assertNonEmptyFile(path: string, base: string, label: string): Promise<void> {
  await assertOwnedPathComponents(path, base)
  let pathStat
  try {
    pathStat = await lstat(path)
  } catch (error) {
    if (!isNotFound(error)) throw error
    throw new Error(`Staged package ${label} must be a non-empty owned regular file.`, {
      cause: error,
    })
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.size === 0) {
    throw new Error(`Staged package ${label} must be a non-empty owned regular file.`)
  }
}

function resolveContainedPackagePath(packageRoot: string, path: string, label: string): string {
  if (path.includes('\0') || isAbsolute(path) || path !== path.replace(/\\/g, '/')) {
    throw new Error(`${label} must be a normalized relative package path.`)
  }
  const resolved = resolve(packageRoot, path)
  const contained = relative(packageRoot, resolved)
  if (
    contained === '' ||
    contained === '..' ||
    contained.startsWith(`..${sep}`) ||
    isAbsolute(contained)
  ) {
    throw new Error(`${label} must be inside the staged package.`)
  }
  if (contained !== path) {
    throw new Error(`${label} must be a normalized relative package path.`)
  }
  return resolved
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
