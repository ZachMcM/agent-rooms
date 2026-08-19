import { createHash } from 'node:crypto'
import { dirname, basename, join } from 'node:path'

import { providerHookConfig } from '../commands/hooks'
import {
  ensurePrivateDirectory,
  readOptionalOwnedFile,
  readOwnedFile,
  removeEmptyDirectory,
  removeOwnedPath,
  writeFileAtomically,
} from './filesystem'
import { parseJsonc, reconcileJsoncObjectArray } from './jsonc'
import type { ManagedFile, ManagedHook } from './manifest'
import { removeManagedPathBlock, upsertManagedPathBlock } from './path'
import type { ClientRoot } from './preflight'

const skillName = 'agent-rooms'
const managedBlockPattern = /(^|\n)# >>> agent-rooms >>>\n[\s\S]*?\n# <<< agent-rooms <<</g

type PatchResult = { content: string; hooks: ManagedHook[] }

export type ClientContext = {
  home: string
  root: string
  bin: string
  roots: ClientRoot[]
  shell: string
  platform: NodeJS.Platform
}

export type RollbackJournal = {
  restore: Array<{ path: string; content: string }>
  remove: string[]
  directories: string[]
}

export async function patchClients(
  context: ClientContext,
  skillContent: string,
  priorHooks: ManagedHook[],
): Promise<{
  hooks: ManagedHook[]
  skills: ManagedFile[]
  profiles: ManagedFile[]
  journal: RollbackJournal
}> {
  const journal: RollbackJournal = { restore: [], remove: [], directories: [] }
  const hooks: ManagedHook[] = []
  try {
    for (const root of context.roots) {
      const path = configPath(root)
      const before = await readOptionalOwnedFile(path, context.home)
      if (before !== undefined) journal.restore.push({ path, content: before })
      else journal.remove.push(path)
      const patched = patchHooks(
        before ?? '{}\n',
        root.client,
        context.bin,
        path,
        priorHooks.filter((hook) => hook.path === path),
      )
      await ensurePrivateDirectoryTracked(dirname(path), context, journal)
      await writeFileAtomically(path, patched.content, context.home)
      hooks.push(...patched.hooks)

      const skill = skillPath(root, context.home)
      const current = await readOptionalOwnedFile(skill, context.home)
      if (current !== undefined && sha256(current) !== sha256(skillContent)) {
        throw new Error(`Refusing to overwrite modified skill: ${skill}.`)
      }
      if (current === undefined) journal.remove.push(skill)
      await ensurePrivateDirectoryTracked(dirname(skill), context, journal)
      await writeFileAtomically(skill, skillContent, context.home)
    }
    const activeConfigPaths = new Set(context.roots.map(configPath))
    for (const path of unique(priorHooks.map((hook) => hook.path))) {
      if (activeConfigPaths.has(path)) continue
      const before = await readOptionalOwnedFile(path, context.home)
      if (before === undefined) continue
      journal.restore.push({ path, content: before })
      await writeFileAtomically(
        path,
        removeManagedHooks(
          before,
          priorHooks.filter((hook) => hook.path === path),
        ),
        context.home,
      )
    }
    const profile = profilePath(context)
    if (profile) {
      const before = await readOptionalOwnedFile(profile, context.home)
      if (before !== undefined) journal.restore.push({ path: profile, content: before })
      else journal.remove.push(profile)
      await ensurePrivateDirectoryTracked(dirname(profile), context, journal)
      await writeFileAtomically(
        profile,
        renderProfile(before ?? '', join(context.root, 'bin'), context.shell),
        context.home,
      )
    }
    return {
      hooks,
      skills: await managedSkills(context),
      profiles: await managedProfiles(context),
      journal,
    }
  } catch (error) {
    await rollback(journal, context.home)
    throw partialInstallError(error)
  }
}

export async function removeClientHooks(hooks: ManagedHook[], trustedBase: string): Promise<void> {
  const grouped = new Map<string, ManagedHook[]>()
  for (const hook of hooks) grouped.set(hook.path, [...(grouped.get(hook.path) ?? []), hook])

  for (const [path, entries] of grouped) {
    const source = await readOptionalOwnedFile(path, trustedBase)
    if (source === undefined) continue
    await writeFileAtomically(path, removeManagedHooks(source, entries), trustedBase)
  }
}

export function configPath(root: Pick<ClientRoot, 'client' | 'path'>): string {
  return join(
    root.path,
    root.client === 'cursor' || root.client === 'codex' ? 'hooks.json' : 'settings.json',
  )
}

export function skillPath(
  root: Pick<ClientRoot, 'client' | 'path'>,
  homeDirectory: string,
): string {
  const skillRoot = root.client === 'codex' ? join(homeDirectory, '.agents') : root.path
  return join(skillRoot, 'skills', skillName, 'SKILL.md')
}

export function profilePath(context: {
  home: string
  shell: string
  platform: NodeJS.Platform
}): string | undefined {
  const shell = basename(context.shell)
  if (shell === 'zsh') return join(context.home, '.zshrc')
  if (shell === 'bash') {
    return join(context.home, context.platform === 'darwin' ? '.bash_profile' : '.bashrc')
  }
  if (shell === 'fish') return join(context.home, '.config', 'fish', 'config.fish')
}

export function pathWarning(context: ClientContext): string[] {
  if (profilePath(context)) return []
  const shell = context.shell ? ` (${basename(context.shell)})` : ''
  return [`No supported shell was detected${shell}; add ${dirname(context.bin)} to PATH manually.`]
}

export async function removeIfUnchanged(
  file: ManagedFile,
  label: string,
  trustedBase: string,
): Promise<string[]> {
  const current = await readOptionalOwnedFile(file.path, trustedBase)
  if (current === undefined) return []
  if (sha256(current) !== file.hash) {
    return [`Preserved modified ${label}: ${file.path}`]
  }
  await removeOwnedPath(file.path, trustedBase)
  await removeEmptyDirectory(dirname(file.path), trustedBase)
  await removeEmptyDirectory(dirname(dirname(file.path)), trustedBase)
  return []
}

export async function removeProfileBlockIfUnchanged(
  file: ManagedFile,
  trustedBase: string,
): Promise<string[]> {
  const current = await readOptionalOwnedFile(file.path, trustedBase)
  if (current === undefined) return []
  if (sha256(current) !== file.hash) {
    await writeFileAtomically(
      file.path,
      removeManagedPathBlock(current).replace(managedBlockPattern, '$1'),
      trustedBase,
    )
    return [`Removed managed PATH block from modified profile: ${file.path}`]
  }
  await writeFileAtomically(
    file.path,
    removeManagedPathBlock(current).replace(managedBlockPattern, '$1'),
    trustedBase,
  )
  return []
}

export async function preflightTargets(context: ClientContext, skill?: string): Promise<void> {
  for (const root of context.roots) {
    const config = await readOptionalOwnedFile(configPath(root), context.home)
    if (config !== undefined) patchHooks(config, root.client, context.bin, configPath(root))
    const path = skillPath(root, context.home)
    const existingSkill = await readOptionalOwnedFile(path, context.home)
    if (
      skill !== undefined &&
      existingSkill !== undefined &&
      sha256(existingSkill) !== sha256(skill)
    ) {
      throw new Error(`Refusing to overwrite modified skill: ${path}.`)
    }
  }
  const profile = profilePath(context)
  if (profile) await readOptionalOwnedFile(profile, context.home)
}

export async function rollback(journal: RollbackJournal, trustedBase: string): Promise<void> {
  for (const path of journal.remove.toReversed()) await removeOwnedPath(path, trustedBase)
  for (const file of journal.restore.toReversed())
    await writeFileAtomically(file.path, file.content, trustedBase)
  for (const directory of journal.directories) await removeEmptyDirectory(directory, trustedBase)
}

export function partialInstallError(error: unknown): Error {
  const message = error instanceof Error ? error.message : 'Unknown configuration error.'
  return new Error(
    `Installation partially completed: runtime and database were retained; configuration was restored. ${message}`,
  )
}

function patchHooks(
  source: string,
  client: ClientRoot['client'],
  bin: string,
  path: string,
  priorHooks: ManagedHook[] = [],
): PatchResult {
  const parsed = parseJsonc(source) as Record<string, unknown>
  const existing = isRecord(parsed.hooks) ? parsed.hooks : {}
  const owned = (providerHookConfig(bin)[client] as { hooks: Record<string, unknown> }).hooks
  let content = source
  const installed: ManagedHook[] = []

  for (const [event, entries] of Object.entries(owned)) {
    const current = Array.isArray(existing[event]) ? existing[event] : []
    const formerlyOwned = priorHooks
      .filter((hook) => hook.event === event)
      .flatMap((hook) => hook.entries)
    const desired = dedupeExact(entries as unknown[])
    const forceAppend = desired.filter((entry) =>
      formerlyOwned.some((ownedEntry) => equal(ownedEntry, entry)),
    )
    const append = desired.filter(
      (entry) =>
        !forceAppend.some((ownedEntry) => equal(ownedEntry, entry)) &&
        !current.some((existingEntry) => equal(existingEntry, entry)),
    )
    content = reconcileJsoncObjectArray(content, 'hooks', event, formerlyOwned, append, forceAppend)
    if (append.length + forceAppend.length > 0)
      installed.push({ path, event, entries: [...append, ...forceAppend] })
  }

  for (const hook of priorHooks) {
    if (hook.event in owned) continue
    const hooks = parseJsonc(content) as Record<string, unknown>
    const value = isRecord(hooks.hooks) ? hooks.hooks[hook.event] : undefined
    if (!Array.isArray(value)) continue
    content = reconcileJsoncObjectArray(content, 'hooks', hook.event, hook.entries, [])
  }

  return { content, hooks: installed }
}

function removeManagedHooks(source: string, entries: ManagedHook[]): string {
  const parsed = parseJsonc(source) as Record<string, unknown>
  if (!isRecord(parsed.hooks)) return source
  let content = source
  for (const hook of entries) {
    const hooks = (parseJsonc(content) as Record<string, unknown>).hooks
    if (!isRecord(hooks)) continue
    const current = hooks[hook.event]
    if (!Array.isArray(current)) continue
    content = reconcileJsoncObjectArray(content, 'hooks', hook.event, hook.entries, [])
  }
  return content
}

function renderProfile(content: string, bin: string, shell: string): string {
  if (basename(shell) !== 'fish') return upsertManagedPathBlock(content, bin)
  const stripped = content.replace(managedBlockPattern, '$1')
  return `${stripped}${stripped && !stripped.endsWith('\n') ? '\n' : ''}# >>> agent-rooms >>>\nfish_add_path ${quoteFish(bin)}\n# <<< agent-rooms <<<\n`
}

function quoteFish(value: string): string {
  return `'${value.replaceAll("'", "\\'")}'`
}

async function managedSkills(context: ClientContext): Promise<ManagedFile[]> {
  return Promise.all(
    context.roots.map(async (root) => managedFile(skillPath(root, context.home), context.home)),
  )
}

async function managedProfiles(context: ClientContext): Promise<ManagedFile[]> {
  const path = profilePath(context)
  return path ? [await managedFile(path, context.home)] : []
}

async function managedFile(path: string, trustedBase: string): Promise<ManagedFile> {
  return { path, hash: sha256(await readOwnedFile(path, trustedBase)) }
}

async function ensurePrivateDirectoryTracked(
  path: string,
  context: ClientContext,
  journal: RollbackJournal,
): Promise<void> {
  const created = await ensurePrivateDirectory(path, context.home)
  journal.directories.push(...created.toReversed())
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function dedupeExact(values: unknown[]): unknown[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = JSON.stringify(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
