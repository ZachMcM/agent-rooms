import { randomUUID } from 'node:crypto'
import type { Stats } from 'node:fs'
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export async function ensurePrivateDirectory(
  path: string,
  base: string,
  options: { uid?: number; tightenExisting?: boolean } = {},
): Promise<string[]> {
  const uid = options.uid ?? process.getuid?.()
  assertNormalizedAbsolutePath(path)
  assertNormalizedAbsolutePath(base)
  assertContainedPath(path, base)
  await assertOwnedDirectory(base, uid)

  const relativePath = relative(base, path)
  const components = relativePath === '' ? [] : relativePath.split(/[\\/]/)
  const created: string[] = []
  let current = base
  for (const component of components) {
    await assertOwnedPathComponents(current, base, uid)
    current = join(current, component)
    try {
      await assertOwnedDirectory(current, uid)
    } catch (error) {
      if (!isNotFound(error)) throw error
      try {
        await mkdir(current, { mode: 0o700 })
      } catch (mkdirError) {
        if (!isAlreadyExists(mkdirError)) throw mkdirError
      }
      await assertOwnedPathComponents(current, base, uid)
      await assertOwnedDirectory(current, uid)
      await chmod(current, 0o700)
      created.push(current)
    }
  }

  if (options.tightenExisting && !created.includes(path)) {
    await assertOwnedPathComponents(path, base, uid)
    await chmod(path, 0o700)
  }
  return created
}

export async function assertOwnedDirectory(
  path: string,
  uid: number | undefined = process.getuid?.(),
): Promise<void> {
  await ownedStat(path, 'directory', uid)
}

export async function assertOwnedRegularFile(
  path: string,
  uid: number | undefined = process.getuid?.(),
): Promise<Stats> {
  return await ownedStat(path, 'regular file', uid)
}

export async function assertOwnedPathComponents(
  path: string,
  base: string,
  uid: number | undefined = process.getuid?.(),
): Promise<void> {
  assertNormalizedAbsolutePath(path)
  assertNormalizedAbsolutePath(base)
  assertContainedPath(path, base)
  const relativePath = relative(base, path)

  const components = relativePath === '' ? [] : relativePath.split(/[\\/]/)
  let current = base
  await assertOwnedDirectory(current, uid)
  for (const [index, component] of components.entries()) {
    current = join(current, component)
    try {
      await ownedStat(current, index < components.length - 1 ? 'directory' : 'path', uid)
    } catch (error) {
      if (isNotFound(error)) return
      throw error
    }
  }
}

export async function writePrivateFileAtomically(
  path: string,
  content: string | Uint8Array,
  base: string,
): Promise<void> {
  const parent = dirname(path)
  await ensurePrivateDirectory(parent, base)
  await writeFileAtomically(path, content, base, 0o600)
}

export async function writeFileAtomically(
  path: string,
  content: string | Uint8Array,
  base: string,
  mode: number = 0o600,
): Promise<void> {
  await assertOwnedPathComponents(dirname(path), base)
  await assertOwnedDirectory(dirname(path))
  const existingMode = await replaceableFileMode(path, base)

  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`)
  try {
    await assertOwnedPathComponents(dirname(temporary), base)
    await writeFile(temporary, content, {
      encoding: 'utf8',
      mode: existingMode ?? mode,
      flag: 'wx',
    })
    await assertOwnedPathComponents(temporary, base)
    await chmod(temporary, existingMode ?? mode)
    await replaceableFileMode(path, base)
    await assertOwnedPathComponents(temporary, base)
    await rename(temporary, path)
  } finally {
    await removeTemporaryFile(temporary, base)
  }
}

export async function readOptionalOwnedFile(
  path: string,
  base: string,
): Promise<string | undefined> {
  await assertOwnedPathComponents(dirname(path), base)
  try {
    const stat = await lstat(path)
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`Expected owned regular file at ${path}.`)
    }
    assertOwnership(stat.uid, process.getuid?.(), path)
    await assertOwnedPathComponents(path, base)
    return await readFile(path, 'utf8')
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

export async function readOwnedFile(path: string, base: string): Promise<string> {
  const content = await readOptionalOwnedFile(path, base)
  if (content === undefined) throw new Error(`Expected owned regular file at ${path}.`)
  return content
}

export async function ownedPathExists(path: string, base: string): Promise<boolean> {
  await assertOwnedPathComponents(dirname(path), base)
  try {
    const stat = await lstat(path)
    assertOwnership(stat.uid, process.getuid?.(), path)
    return true
  } catch (error) {
    if (isNotFound(error)) return false
    throw error
  }
}

export async function removeOwnedPath(path: string, base: string): Promise<void> {
  await assertOwnedPathComponents(dirname(path), base)
  try {
    const stat = await lstat(path)
    assertOwnership(stat.uid, process.getuid?.(), path)
    await assertOwnedPathComponents(dirname(path), base)
    if (stat.isSymbolicLink() || stat.isFile()) await unlink(path)
    else if (stat.isDirectory()) {
      await assertOwnedPathComponents(path, base)
      await removeOwnedDirectoryTree(path, base)
    } else throw new Error(`Refusing to remove unsupported path: ${path}.`)
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}

export async function removeEmptyDirectory(path: string, base: string): Promise<void> {
  try {
    await assertOwnedPathComponents(path, base)
    await rmdir(path)
  } catch (error) {
    if (!isNotFound(error) && !isDirectoryNotEmpty(error)) throw error
  }
}

export async function replaceLink(path: string, target: string, base: string): Promise<void> {
  await assertReplaceableLink(path, base)

  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`)
  try {
    await assertOwnedPathComponents(dirname(temporary), base)
    await symlink(target, temporary)
    const stat = await lstat(temporary)
    if (!stat.isSymbolicLink()) throw new Error(`Expected owned symbolic link at ${temporary}.`)
    assertOwnership(stat.uid, process.getuid?.(), temporary)
    await assertReplaceableLink(path, base)
    await rename(temporary, path)
  } finally {
    await removeOwnedPath(temporary, base)
  }
}

async function replaceableFileMode(path: string, base: string): Promise<number | undefined> {
  await assertOwnedPathComponents(dirname(path), base)
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Expected owned regular file at ${path}.`)
    }
    assertOwnership(stat.uid, process.getuid?.(), path)
    return stat.mode & 0o777
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

async function removeOwnedDirectoryTree(path: string, base: string): Promise<void> {
  await assertOwnedPathComponents(path, base)
  for (const entry of await readdir(path)) {
    const child = join(path, entry)
    await assertOwnedPathComponents(dirname(child), base)
    const stat = await lstat(child)
    assertOwnership(stat.uid, process.getuid?.(), child)
    if (stat.isSymbolicLink() || stat.isFile()) {
      await assertOwnedPathComponents(dirname(child), base)
      await unlink(child)
    } else if (stat.isDirectory()) {
      await removeOwnedDirectoryTree(child, base)
    } else {
      throw new Error(`Refusing to remove unsupported path: ${child}.`)
    }
  }
  await assertOwnedPathComponents(path, base)
  await rmdir(path)
}

async function ownedStat(
  path: string,
  kind: 'directory' | 'regular file' | 'path',
  uid: number | undefined,
): Promise<Stats> {
  const stat = await lstat(path)
  if (stat.isSymbolicLink()) throw new Error(`Refusing to use symbolic link at ${path}.`)
  if (kind === 'directory' && !stat.isDirectory()) {
    throw new Error(`Expected owned directory at ${path}.`)
  }
  if (kind === 'regular file' && !stat.isFile()) {
    throw new Error(`Expected owned regular file at ${path}.`)
  }
  assertOwnership(stat.uid, uid, path)
  return stat
}

async function removeTemporaryFile(path: string, base: string): Promise<void> {
  await assertOwnedPathComponents(dirname(path), base)
  try {
    const stat = await lstat(path)
    if (!stat.isFile() && !stat.isSymbolicLink()) {
      throw new Error(`Refusing to remove unsupported temporary path: ${path}.`)
    }
    assertOwnership(stat.uid, process.getuid?.(), path)
    await assertOwnedPathComponents(dirname(path), base)
    await unlink(path)
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}

async function assertReplaceableLink(path: string, base: string): Promise<void> {
  await assertOwnedPathComponents(dirname(path), base)
  try {
    const existing = await lstat(path)
    assertOwnership(existing.uid, process.getuid?.(), path)
    if (!existing.isSymbolicLink()) {
      throw new Error(`Refusing to replace unsupported path with symlink: ${path}.`)
    }
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}

function assertOwnership(actualUid: number, expectedUid: number | undefined, path: string): void {
  if (expectedUid !== undefined && actualUid !== expectedUid) {
    throw new Error(`Refusing to use path not owned by the current user: ${path}.`)
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'
}

function isDirectoryNotEmpty(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOTEMPTY' || error.code === 'EEXIST')
  )
}

function assertNormalizedAbsolutePath(path: string): void {
  if (!path || path.includes('\0') || !isAbsolute(path) || path !== resolve(path)) {
    throw new Error(`Path must be a normalized absolute path: ${path}.`)
  }
}

function assertContainedPath(path: string, base: string): void {
  const relativePath = relative(base, path)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Path must be inside its base directory: ${path}.`)
  }
}
