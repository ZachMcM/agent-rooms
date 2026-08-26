import { chmod, lstat, mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertOwnedRegularFile,
  assertOwnedPathComponents,
  ensurePrivateDirectory,
  removeOwnedPath,
  writeFileAtomically,
  writePrivateFileAtomically,
} from './filesystem'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map(async (directory) =>
        (await import('node:fs/promises')).rm(directory, { recursive: true, force: true }),
      ),
  )
})

describe('private filesystem operations', () => {
  it('writes private files atomically', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    const path = join(directory, 'nested', 'manifest.json')

    await writePrivateFileAtomically(path, '{"ok":true}', directory)

    expect(await readFile(path, 'utf8')).toBe('{"ok":true}')
    expect((await lstat(path)).mode & 0o777).toBe(0o600)
  })

  it('refuses to replace symlinks', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    const target = join(directory, 'target')
    const link = join(directory, 'link')
    await writeFile(target, 'keep')
    await symlink(target, link)

    await expect(writePrivateFileAtomically(link, 'new', directory)).rejects.toThrow('regular file')
    await expect(readFile(target, 'utf8')).resolves.toBe('keep')
  })

  it('refuses non-file paths', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    const child = join(directory, 'child')
    await mkdir(child)
    await expect(assertOwnedRegularFile(child)).rejects.toThrow('regular file')
  })

  it('refuses symlinks in owned path components', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    await mkdir(join(directory, 'real'))
    await symlink(join(directory, 'real'), join(directory, 'linked'))

    await expect(
      assertOwnedPathComponents(join(directory, 'linked', 'file'), directory),
    ).rejects.toThrow('symbolic link')
  })

  it('refuses to create through an intermediate symlink', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    await mkdir(join(directory, 'real'))
    await symlink(join(directory, 'real'), join(directory, 'linked'))

    await expect(
      ensurePrivateDirectory(join(directory, 'linked', 'nested'), directory),
    ).rejects.toThrow('symbolic link')
  })

  it('refuses an existing final directory reached through a symlinked parent', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    await mkdir(join(directory, 'real', 'existing'), { recursive: true })
    await symlink(join(directory, 'real'), join(directory, 'linked'))

    await expect(
      writeFileAtomically(join(directory, 'linked', 'existing', 'config.json'), '{}', directory),
    ).rejects.toThrow('symbolic link')
    await expect(lstat(join(directory, 'real', 'existing', 'config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('preserves modes of pre-existing parent directories', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    const existing = join(directory, 'existing')
    await mkdir(existing, { mode: 0o755 })
    await chmod(existing, 0o755)

    await ensurePrivateDirectory(join(existing, 'private'), directory)

    expect((await lstat(existing)).mode & 0o777).toBe(0o755)
    expect((await lstat(join(existing, 'private'))).mode & 0o777).toBe(0o700)
  })

  it('preserves an existing configuration file mode', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    const path = join(directory, 'config.json')
    await writeFile(path, '{}')
    await chmod(path, 0o640)

    await writeFileAtomically(path, '{"enabled":true}', directory)

    expect((await lstat(path)).mode & 0o777).toBe(0o640)
  })

  it('removes nested symlinks without touching their targets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-installer-'))
    directories.push(directory)
    const tree = join(directory, 'tree')
    const outside = join(directory, 'outside')
    await mkdir(join(tree, 'nested'), { recursive: true })
    await mkdir(outside)
    await writeFile(join(tree, 'nested', 'owned'), 'remove')
    await writeFile(join(outside, 'keep'), 'keep')
    await symlink(outside, join(tree, 'nested', 'linked-outside'))

    await removeOwnedPath(tree, directory)

    await expect(lstat(tree)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(outside, 'keep'), 'utf8')).resolves.toBe('keep')
  })
})
