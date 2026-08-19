import { spawn as spawnChild } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { dataDir } from '@agent-rooms/core'
import { createDatabase, runMigrations } from '@agent-rooms/db'

import {
  configPath,
  partialInstallError,
  patchClients,
  pathWarning,
  preflightTargets,
  profilePath,
  removeClientHooks,
  removeIfUnchanged,
  removeProfileBlockIfUnchanged,
  rollback,
  skillPath,
} from './clients'
import {
  assertOwnedDirectory,
  assertOwnedPathComponents,
  ensurePrivateDirectory,
  ownedPathExists,
  removeEmptyDirectory,
  removeOwnedPath,
  readOwnedFile,
  writePrivateFileAtomically,
} from './filesystem'
import {
  currentVersion,
  readManifest,
  readPriorManifest,
  type Manifest,
  type NewManifest,
} from './manifest'
import { resolveInstallSource, snapshotLocalPackage } from './package-source'
import { assertInstallPreflight, detectExistingClientRoots, type ClientRoot } from './preflight'
import {
  existingRuntimePublication,
  migrateDatabase,
  prepareRuntime,
  pruneRuntimesAfterInstall,
  type RuntimeActivation,
  type RuntimePublication,
} from './runtime'
import {
  runForOutput,
  stagedPackageRoot,
  verifyRuntimeTree,
  type Spawn,
  type SpawnResult,
} from './stage-verification'
import { compareVersions } from './state'

const packageName = 'agent-rooms'

type Prompt = (message: string) => Promise<boolean>

export type TransactionDependencies = {
  homeDirectory?: string
  roots?: ClientRoot[]
  shell?: string
  platform?: NodeJS.Platform
  spawn?: Spawn
  prompt?: Prompt
  isTTY?: boolean
  migrate?: (databasePath: string) => Promise<void>
  now?: () => Date
}

export type InstallInput = TransactionDependencies & {
  version: string
  yes?: boolean
  dryRun?: boolean
  source?: string
}

export type UninstallInput = TransactionDependencies & {
  yes?: boolean
  purgeData?: boolean
}

type Change = { path: string; action: string }
type InstallResult = { version: string; changes: Change[]; warnings: string[] }
type UninstallResult = { changes: Change[]; warnings: string[] }

export async function runInstall(input: InstallInput): Promise<InstallResult> {
  assertInstallPreflight(input.version, {
    homeDirectory: input.homeDirectory,
    platform: input.platform,
  })
  const source = await resolveInstallSource(input.version, input.source)
  const context = await makeContext(input)
  if (
    input.source !== undefined &&
    (await ownedPathExists(join(context.root, 'runtime', input.version), context.home))
  ) {
    throw new Error(
      `Local package install cannot reuse existing runtime ${input.version}. Run agent-rooms uninstall and retry.`,
    )
  }
  const priorManifest = await readPriorManifest(context)
  const installed = await currentVersion(context.root, context.home)
  if (installed && compareVersions(input.version, installed) < 0) {
    throw new Error(`Refusing to downgrade from ${installed} to ${input.version}.`)
  }

  const plan = await installPlan(context, input.version)
  await preflightInstallTargets(context)
  await preflightTargets(context)
  await runForOutput(context.spawn, 'npm', ['--version'])
  const warnings = pathWarning(context)
  await confirm(plan, input.yes, input.dryRun, context.prompt, context.isTTY)
  if (input.dryRun) return { version: input.version, changes: plan, warnings }

  const stage = join(context.root, `.stage-${input.version}`)
  await removeOwnedPath(stage, context.home)
  try {
    let publication: RuntimePublication | undefined =
      source.kind === 'registry'
        ? await existingRuntimePublication(context, input.version)
        : undefined
    let packageRoot = stagedPackageRoot(join(context.root, 'runtime', input.version))
    if (!publication) {
      await ensurePrivateDirectory(stage, context.home, { tightenExisting: true })
      const npmSource =
        source.kind === 'local'
          ? await snapshotLocalPackage(source, stage, context.home)
          : source.value
      try {
        await runForOutput(context.spawn, 'npm', [
          'install',
          '--prefix',
          stage,
          '--omit=dev',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--package-lock=false',
          npmSource,
        ])
      } finally {
        if (source.kind === 'local') await removeOwnedPath(npmSource, context.home)
      }
      publication = {
        kind: 'staged',
        executable: await verifyRuntimeTree(stage, context.home, input.version, context.spawn),
      }
      packageRoot = stagedPackageRoot(stage)
    }
    const skill = await readSkill(packageRoot, context.home)
    await preflightTargets(context, skill)
    await migrateDatabase(context)
    const activation = await prepareRuntime(context, stage, input.version, publication)
    await removeOwnedPath(stage, context.home)
    const clientResult = await patchClientsAfterActivation(
      context,
      skill,
      priorManifest?.hooks ?? [],
      activation,
    )
    try {
      const state: NewManifest = {
        version: 1,
        package: { name: packageName, version: input.version },
        installedAt: context.now().toISOString(),
        current: input.version,
        roots: context.roots.map((root) => ({
          client: root.client,
          path: root.path,
          config: configPath(root),
        })),
        hooks: clientResult.hooks,
        skills: clientResult.skills,
        profiles: clientResult.profiles,
      }
      await writePrivateFileAtomically(
        join(context.root, 'install-state.json'),
        JSON.stringify(state, null, 2),
        context.home,
      )
    } catch (error) {
      try {
        await rollback(clientResult.journal, context.home)
      } finally {
        await activation.restoreLinks()
      }
      throw partialInstallError(error)
    }
    await pruneRuntimesAfterInstall(
      context,
      input.version,
      installed === input.version ? undefined : installed,
    )
    return { version: input.version, changes: plan, warnings }
  } catch (error) {
    await removeOwnedPath(stage, context.home)
    throw error
  }
}

async function restoreRuntimeLinks(activation: RuntimeActivation, error: unknown): Promise<never> {
  await activation.restoreLinks()
  throw error
}

async function patchClientsAfterActivation(
  context: Context,
  skill: string,
  priorHooks: Parameters<typeof patchClients>[2],
  activation: RuntimeActivation,
): ReturnType<typeof patchClients> {
  try {
    return await patchClients(context, skill, priorHooks)
  } catch (error) {
    return await restoreRuntimeLinks(activation, error)
  }
}

export async function runUninstall(input: UninstallInput): Promise<UninstallResult> {
  const context = await makeContext({ ...input, roots: input.roots ?? [] })
  const manifest = await readManifest(join(context.root, 'install-state.json'), context)
  const plan = uninstallPlan(context, manifest, input.purgeData ?? false)
  await confirm(plan, input.yes, false, context.prompt, context.isTTY)
  const warnings: string[] = []

  await removeClientHooks(manifest.hooks, context.home)
  for (const file of manifest.skills)
    warnings.push(...(await removeIfUnchanged(file, 'skill', context.home)))
  for (const file of manifest.profiles)
    warnings.push(...(await removeProfileBlockIfUnchanged(file, context.home)))
  await removeOwnedPath(context.bin, context.home)
  await removeOwnedPath(join(context.root, 'current'), context.home)
  await removeOwnedPath(join(context.root, 'previous'), context.home)
  await removeOwnedPath(join(context.root, 'runtime'), context.home)
  await removeOwnedPath(join(context.root, 'backups'), context.home)
  await removeOwnedPath(join(context.root, 'install-state.json'), context.home)
  if (input.purgeData) await removeOwnedPath(join(context.root, 'db.sqlite'), context.home)
  await removeEmptyDirectory(join(context.root, 'bin'), context.home)
  await removeEmptyDirectory(context.root, context.home)
  return { changes: plan, warnings }
}

type Context = Required<
  Pick<TransactionDependencies, 'spawn' | 'prompt' | 'migrate' | 'now' | 'isTTY'>
> & {
  home: string
  root: string
  bin: string
  roots: ClientRoot[]
  shell: string
  platform: NodeJS.Platform
}

async function makeContext(dependencies: TransactionDependencies): Promise<Context> {
  const home = dependencies.homeDirectory ?? homedir()
  const roots = dependencies.roots ?? (await detectExistingClientRoots(process.env, home))
  return {
    home,
    root: dataDir(home),
    bin: join(dataDir(home), 'bin', 'agent-rooms'),
    roots,
    shell: dependencies.shell ?? process.env.SHELL ?? '',
    platform: dependencies.platform ?? process.platform,
    spawn: dependencies.spawn ?? spawn,
    prompt: dependencies.prompt ?? prompt,
    isTTY: dependencies.isTTY ?? process.stdin.isTTY,
    migrate:
      dependencies.migrate ??
      (async (databasePath) => {
        await ensurePrivateDirectory(dirname(databasePath), home, { tightenExisting: true })
        await runMigrations(createDatabase(`file:${databasePath}`))
      }),
    now: dependencies.now ?? (() => new Date()),
  }
}

async function installPlan(context: Context, version: string): Promise<Change[]> {
  const changes: Change[] = [
    { path: join(context.root, 'runtime', version), action: 'install verified runtime' },
    { path: join(context.root, 'db.sqlite'), action: 'migrate database' },
    { path: context.bin, action: 'update executable link' },
  ]
  for (const root of context.roots) {
    changes.push({ path: configPath(root), action: `patch ${root.client} hooks` })
    changes.push({ path: skillPath(root, context.home), action: `install ${root.client} skill` })
  }
  const profile = profilePath(context)
  if (profile) changes.push({ path: profile, action: 'add PATH block' })
  return changes
}

function uninstallPlan(context: Context, manifest: Manifest, purgeData: boolean): Change[] {
  return [
    ...unique(manifest.hooks.map((hook) => hook.path)).map((path) => ({
      path,
      action: 'remove owned hooks',
    })),
    ...manifest.skills.map(({ path }) => ({ path, action: 'remove unchanged skill' })),
    ...manifest.profiles.map(({ path }) => ({ path, action: 'remove PATH block' })),
    { path: context.root, action: 'remove runtime and manifest' },
    ...(purgeData ? [{ path: join(context.root, 'db.sqlite'), action: 'remove database' }] : []),
  ]
}

async function preflightInstallTargets(context: Context): Promise<void> {
  await assertOwnedPathComponents(context.root, context.home)
  await assertOwnedPathComponents(dirname(context.bin), context.home)
  for (const root of context.roots) {
    await assertOwnedDirectory(root.path)
    await assertOwnedPathComponents(root.path, context.home)
  }
}

async function confirm(
  changes: Change[],
  yes: boolean | undefined,
  dryRun: boolean | undefined,
  ask: Prompt,
  isTTY: boolean,
) {
  if (dryRun) return
  if (yes) return
  if (!isTTY) throw new Error('Noninteractive install and uninstall require --yes.')
  const preview = changes.map((change) => `- ${change.action}: ${change.path}`).join('\n')
  if (!(await ask(`The following changes will be made:\n${preview}\nContinue?`)))
    throw new Error('Installation cancelled.')
}

async function readSkill(packageRoot: string, trustedBase: string): Promise<string> {
  return await readOwnedFile(join(packageRoot, 'assets', 'agent-rooms', 'SKILL.md'), trustedBase)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function spawn(command: string, args: string[], options?: { cwd?: string }): Promise<SpawnResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawnChild(command, args, {
      cwd: options?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    child.once('error', reject)
    child.once('exit', (code) =>
      code === 0
        ? resolveResult({
            stdout: Buffer.concat(stdout).toString(),
            stderr: Buffer.concat(stderr).toString(),
          })
        : reject(new Error(`${command} exited with ${code}.`)),
    )
  })
}

function prompt(message: string): Promise<boolean> {
  process.stdout.write(`${message} [y/N] `)
  return new Promise((resolveAnswer) =>
    process.stdin.once('data', (data) => {
      process.stdin.pause()
      resolveAnswer(/^y(?:es)?\s*$/i.test(String(data)))
    }),
  )
}
