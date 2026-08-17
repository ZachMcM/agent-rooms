import { chmod, lstat, readlink, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  assertOwnedPathComponents,
  assertOwnedRegularFile,
  ensurePrivateDirectory,
  ownedPathExists,
  removeOwnedPath,
  renameOwnedDirectory,
  replaceLink,
} from './filesystem'
import type { Spawn } from './stage-verification'
import { verifyRuntimeTree } from './stage-verification'

const packageName = 'agent-rooms'

export async function prepareRuntime(
  context: RuntimeContext,
  stage: string,
  version: string,
  publication: RuntimePublication,
): Promise<RuntimeActivation> {
  await ensurePrivateDirectory(context.root, context.home, { tightenExisting: true })
  const runtime = join(context.root, 'runtime')
  await ensurePrivateDirectory(runtime, context.home, { tightenExisting: true })
  const destination = join(runtime, version)
  const executable = await publishRuntime(context, stage, destination, publication)
  await ensurePrivateDirectory(join(context.root, 'bin'), context.home, {
    tightenExisting: true,
  })
  const links = [
    await captureLinkState(join(context.root, 'current'), context.home),
    await captureLinkState(context.bin, context.home),
  ]
  try {
    await replaceLink(join(context.root, 'current'), join('runtime', version), context.home)
    await replaceLink(
      context.bin,
      join('..', 'current', 'node_modules', packageName, executable),
      context.home,
    )
  } catch (error) {
    await restoreLinkStates(links, context.home)
    throw error
  }
  return {
    executable,
    restoreLinks: async () => restoreLinkStates(links, context.home),
  }
}

export async function existingRuntimePublication(
  context: RuntimeContext,
  version: string,
): Promise<RuntimePublication | undefined> {
  const destination = join(context.root, 'runtime', version)
  if (!(await ownedPathExists(destination, context.home))) return undefined
  try {
    return {
      kind: 'existing',
      executable: await verifyRuntimeTree(destination, context.home, version, context.spawn),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown verification failure.'
    throw new Error(
      `Existing Agent Rooms runtime ${version} failed verification; remove ${destination} and rerun install to repair it. ${message}`,
      { cause: error },
    )
  }
}

export async function pruneRuntimesAfterInstall(
  context: RuntimeContext,
  current: string,
  retained: string | undefined,
): Promise<void> {
  await removeOwnedPath(join(context.root, 'previous'), context.home)
  await removeOwnedPath(join(context.root, 'backups'), context.home)
  await pruneRuntimes(join(context.root, 'runtime'), current, retained, context.home)
}

export async function migrateDatabase(context: RuntimeContext): Promise<void> {
  const path = join(context.root, 'db.sqlite')
  await context.migrate(path)
  await assertOwnedPathComponents(path, context.home)
  await assertOwnedRegularFile(path)
  await assertOwnedPathComponents(path, context.home)
  await chmod(path, 0o600)
}

async function publishRuntime(
  context: RuntimeContext,
  stage: string,
  destination: string,
  publication: RuntimePublication,
): Promise<string> {
  if (publication.kind === 'existing') return publication.executable
  await assertOwnedPathComponents(stage, context.home)
  await renameOwnedDirectory(stage, destination, context.home)
  return publication.executable
}

async function captureLinkState(path: string, trustedBase: string): Promise<LinkState> {
  await assertOwnedPathComponents(dirname(path), trustedBase)
  try {
    const stat = await lstat(path)
    if (!stat.isSymbolicLink()) {
      throw new Error(`Refusing to replace unsupported path with symlink: ${path}.`)
    }
    if (process.getuid?.() !== undefined && stat.uid !== process.getuid?.()) {
      throw new Error(`Refusing to use path not owned by the current user: ${path}.`)
    }
    return { kind: 'symlink', path, target: await readlink(path) }
  } catch (error) {
    if (isNotFound(error)) return { kind: 'absent', path }
    throw error
  }
}

async function restoreLinkStates(states: LinkState[], trustedBase: string): Promise<void> {
  for (const state of states.toReversed()) {
    if (state.kind === 'absent') await removeOwnedPath(state.path, trustedBase)
    else await replaceLink(state.path, state.target, trustedBase)
  }
}

async function pruneRuntimes(
  runtime: string,
  current: string,
  retained: string | undefined,
  trustedBase: string,
): Promise<void> {
  await assertOwnedPathComponents(runtime, trustedBase)
  for (const name of await readdir(runtime)) {
    if (name !== current && name !== retained)
      await removeOwnedPath(join(runtime, name), trustedBase)
  }
}

export type RuntimeContext = {
  home: string
  root: string
  bin: string
  spawn: Spawn
  migrate: (databasePath: string) => Promise<void>
}

export type RuntimePublication =
  | { kind: 'existing'; executable: string }
  | { kind: 'staged'; executable: string }

export type RuntimeActivation = {
  executable: string
  restoreLinks: () => Promise<void>
}

type LinkState =
  | { kind: 'absent'; path: string }
  | { kind: 'symlink'; path: string; target: string }

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
