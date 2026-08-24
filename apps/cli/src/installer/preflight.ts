import { lstat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { isStrictVersion } from './state'

export type ClientRoot = {
  client: 'claude' | 'codex' | 'cursor' | 'opencode'
  path: string
}

export type PreflightEnvironment = {
  homeDirectory?: string
  nodeVersion?: string
  platform?: NodeJS.Platform
  uid?: number
}

export function assertInstallPreflight(
  packageVersion: string,
  environment: PreflightEnvironment = {},
): void {
  const platform = environment.platform ?? process.platform
  const nodeVersion = environment.nodeVersion ?? process.versions.node
  const uid = environment.uid ?? process.getuid?.()

  if (platform !== 'darwin' && platform !== 'linux') {
    throw new Error('Agent Rooms installation is supported only on macOS and Linux.')
  }

  if (uid === 0) {
    throw new Error('Refusing to install Agent Rooms as root.')
  }

  if (!isNodeVersionAtLeast(nodeVersion, 22, 12, 0)) {
    throw new Error('Agent Rooms installation requires Node.js 22.12.0 or newer.')
  }

  if (!isStrictVersion(packageVersion)) {
    throw new Error('Agent Rooms package version must be strict semver.')
  }

  assertSafeAbsolutePath(environment.homeDirectory ?? homedir(), 'Home directory')
}

export function isNodeVersionAtLeast(
  version: string,
  major: number,
  minor: number,
  patch: number,
): boolean {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].*)?$/.exec(version)

  if (!match) {
    return false
  }

  const actual = match.slice(1, 4).map(Number)
  const required = [major, minor, patch]

  for (let index = 0; index < actual.length; index += 1) {
    const actualPart = actual[index]!
    const requiredPart = required[index]!
    if (actualPart > requiredPart) return true
    if (actualPart < requiredPart) return false
  }
  return true
}

export async function detectExistingClientRoots(
  environment: NodeJS.ProcessEnv = process.env,
  homeDirectory: string = homedir(),
): Promise<ClientRoot[]> {
  assertSafeAbsolutePath(homeDirectory, 'Home directory')

  const candidates: ClientRoot[] = [
    { client: 'claude', path: environment.CLAUDE_CONFIG_DIR ?? join(homeDirectory, '.claude') },
    { client: 'codex', path: environment.CODEX_HOME ?? join(homeDirectory, '.codex') },
    { client: 'cursor', path: join(homeDirectory, '.cursor') },
    { client: 'opencode', path: join(homeDirectory, '.config', 'opencode') },
  ]

  const roots: ClientRoot[] = []
  for (const candidate of candidates) {
    assertSafeAbsolutePath(candidate.path, `${candidate.client} configuration directory`)
    if (await isExistingDirectory(candidate.path, homeDirectory)) {
      roots.push({ ...candidate, path: resolve(candidate.path) })
    }
  }
  return roots
}

export function assertSafeAbsolutePath(path: string, label: string): void {
  if (!path || path.includes('\0') || !isAbsolute(path) || path !== resolve(path)) {
    throw new Error(`${label} must be a normalized absolute path.`)
  }
}

export function assertPathWithin(path: string, parent: string, label: string): void {
  assertSafeAbsolutePath(path, label)
  assertSafeAbsolutePath(parent, 'Parent path')
  const pathRelative = relative(parent, path)
  if (
    pathRelative === '' ||
    pathRelative === '..' ||
    pathRelative.startsWith(`..${sep}`) ||
    isAbsolute(pathRelative)
  ) {
    throw new Error(`${label} must be inside its parent directory.`)
  }
}

async function isExistingDirectory(path: string, homeDirectory: string): Promise<boolean> {
  try {
    if (path === homeDirectory || isPathInside(path, homeDirectory)) {
      await assertSafeExistingComponents(path, homeDirectory)
    }
    const stat = await lstat(path)
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to use symbolic link at ${path}.`)
    }
    return stat.isDirectory()
  } catch (error) {
    if (isNotFound(error)) {
      return false
    }
    throw error
  }
}

async function assertSafeExistingComponents(path: string, base: string): Promise<void> {
  let current = path
  const pending: string[] = []
  while (current !== base) {
    pending.push(current)
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  for (const component of pending.toReversed()) {
    const stat = await lstat(component)
    if (stat.isSymbolicLink()) throw new Error(`Refusing to use symbolic link at ${component}.`)
    if (!stat.isDirectory()) throw new Error(`Expected owned directory at ${component}.`)
    if (process.getuid?.() !== undefined && stat.uid !== process.getuid?.()) {
      throw new Error(`Refusing to use path not owned by the current user: ${component}.`)
    }
  }
}

function isPathInside(path: string, parent: string): boolean {
  const pathRelative = relative(parent, path)
  return (
    pathRelative !== '' &&
    pathRelative !== '..' &&
    !pathRelative.startsWith(`..${sep}`) &&
    !isAbsolute(pathRelative)
  )
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
