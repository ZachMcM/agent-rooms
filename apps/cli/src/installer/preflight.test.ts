import { mkdtemp, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertInstallPreflight,
  assertSafeAbsolutePath,
  detectExistingClientRoots,
  isNodeVersionAtLeast,
} from './preflight'

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

describe('preflight', () => {
  it('requires a supported non-root platform and strict package version', () => {
    expect(() =>
      assertInstallPreflight('1.2.3', {
        platform: 'darwin',
        nodeVersion: '22.12.0',
        uid: 501,
        homeDirectory: '/Users/test',
      }),
    ).not.toThrow()
    expect(() =>
      assertInstallPreflight('latest', {
        platform: 'darwin',
        nodeVersion: '22.12.0',
        uid: 501,
        homeDirectory: '/Users/test',
      }),
    ).toThrow('strict semver')
    expect(() =>
      assertInstallPreflight('1.2.3', {
        platform: 'win32',
        nodeVersion: '22.12.0',
        uid: 501,
        homeDirectory: '/Users/test',
      }),
    ).toThrow('macOS and Linux')
    expect(() =>
      assertInstallPreflight('1.2.3', {
        platform: 'linux',
        nodeVersion: '22.11.99',
        uid: 501,
        homeDirectory: '/home/test',
      }),
    ).toThrow('Node.js')
    expect(() =>
      assertInstallPreflight('1.2.3', {
        platform: 'linux',
        nodeVersion: '22.12.0',
        uid: 0,
        homeDirectory: '/home/test',
      }),
    ).toThrow('root')
  })

  it('compares Node versions lexicographically', () => {
    expect(isNodeVersionAtLeast('22.13.0', 22, 12, 0)).toBe(true)
    expect(isNodeVersionAtLeast('22.11.999', 22, 12, 0)).toBe(false)
  })

  it('requires exact resolved absolute paths', () => {
    expect(() => assertSafeAbsolutePath('/tmp/../tmp/agent-rooms', 'Test path')).toThrow(
      'normalized absolute path',
    )
  })

  it('returns existing client roots and rejects symlinks', async () => {
    const home = await mkdtemp(join(tmpdir(), 'agent-rooms-installer-'))
    directories.push(home)
    await mkdir(join(home, '.claude'))
    await mkdir(join(home, '.cursor'))

    await expect(detectExistingClientRoots({}, home)).resolves.toEqual([
      { client: 'claude', path: join(home, '.claude') },
      { client: 'cursor', path: join(home, '.cursor') },
    ])

    await symlink(join(home, '.claude'), join(home, '.codex'))
    await expect(detectExistingClientRoots({}, home)).rejects.toThrow('symbolic link')
  })

  it('rejects symlinks in intermediate client path components', async () => {
    const home = await mkdtemp(join(tmpdir(), 'agent-rooms-installer-'))
    directories.push(home)
    await mkdir(join(home, 'real', '.claude'), { recursive: true })
    await symlink(join(home, 'real'), join(home, 'linked'))

    await expect(
      detectExistingClientRoots({ CLAUDE_CONFIG_DIR: join(home, 'linked', '.claude') }, home),
    ).rejects.toThrow('symbolic link')
  })

  it('finds the Gemini configuration below GEMINI_CLI_HOME', async () => {
    const home = await mkdtemp(join(tmpdir(), 'agent-rooms-installer-'))
    const geminiHome = join(home, 'gemini-home')
    directories.push(home)
    await mkdir(join(geminiHome, '.gemini'), { recursive: true })

    await expect(detectExistingClientRoots({ GEMINI_CLI_HOME: geminiHome }, home)).resolves.toEqual(
      [{ client: 'gemini', path: join(geminiHome, '.gemini') }],
    )
  })
})
