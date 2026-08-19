import { constants, type Stats } from 'node:fs'
import { open } from 'node:fs/promises'
import { join } from 'node:path'

import { assertOwnedRegularFile, removeOwnedPath } from './filesystem'
import { assertSafeAbsolutePath } from './preflight'

const packageName = 'agent-rooms'

type FileFingerprint = Pick<
  Stats,
  'ctimeMs' | 'dev' | 'gid' | 'ino' | 'mode' | 'mtimeMs' | 'nlink' | 'size' | 'uid'
>

export type LocalPackageSource = {
  kind: 'local'
  path: string
  fingerprint: FileFingerprint
}

export type InstallSource = { kind: 'registry'; value: string } | LocalPackageSource

export async function resolveInstallSource(
  version: string,
  source: string | undefined,
): Promise<InstallSource> {
  if (source === undefined) return { kind: 'registry', value: `${packageName}@${version}` }
  assertSafeAbsolutePath(source, 'Local package')
  if (!source.endsWith('.tgz')) {
    throw new Error('Local package must be a .tgz tarball.')
  }
  return {
    kind: 'local',
    path: source,
    fingerprint: fileFingerprint(await assertOwnedRegularFile(source)),
  }
}

export async function snapshotLocalPackage(
  source: LocalPackageSource,
  stage: string,
  home: string,
): Promise<string> {
  const snapshot = join(stage, '.agent-rooms-package.tgz')
  try {
    const sourceHandle = await open(source.path, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const before = await sourceHandle.stat()
      assertOpenedRegularFile(before, source.path)
      assertUnchangedFile(source.fingerprint, before, source.path)
      const snapshotHandle = await open(
        snapshot,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600,
      )
      try {
        await snapshotHandle.chmod(0o600)
        await copyFileHandle(sourceHandle, snapshotHandle)
        await snapshotHandle.sync()
        const snapshotStat = await snapshotHandle.stat()
        assertOpenedRegularFile(snapshotStat, snapshot)
        if (snapshotStat.size !== before.size || (snapshotStat.mode & 0o777) !== 0o600) {
          throw new Error(`Failed to create a complete private snapshot of ${source.path}.`)
        }
      } finally {
        await snapshotHandle.close()
      }
      assertUnchangedFile(fileFingerprint(before), await sourceHandle.stat(), source.path)
    } finally {
      await sourceHandle.close()
    }
    return snapshot
  } catch (error) {
    await removeOwnedPath(snapshot, home)
    throw error
  }
}

async function copyFileHandle(
  source: Awaited<ReturnType<typeof open>>,
  destination: Awaited<ReturnType<typeof open>>,
): Promise<void> {
  const buffer = Buffer.allocUnsafe(64 * 1024)
  let position = 0
  while (true) {
    const { bytesRead } = await source.read(buffer, 0, buffer.length, position)
    if (bytesRead === 0) return
    let offset = 0
    while (offset < bytesRead) {
      const { bytesWritten } = await destination.write(
        buffer,
        offset,
        bytesRead - offset,
        position + offset,
      )
      if (bytesWritten === 0) throw new Error('Failed to snapshot local package.')
      offset += bytesWritten
    }
    position += bytesRead
  }
}

function assertOpenedRegularFile(stat: Stats, path: string): void {
  if (!stat.isFile()) throw new Error(`Expected owned regular file at ${path}.`)
  if (process.getuid?.() !== undefined && stat.uid !== process.getuid?.()) {
    throw new Error(`Refusing to use path not owned by the current user: ${path}.`)
  }
}

function assertUnchangedFile(expected: FileFingerprint, actual: Stats, path: string): void {
  const current = fileFingerprint(actual)
  if (
    Object.keys(expected).some(
      (key) => expected[key as keyof FileFingerprint] !== current[key as keyof FileFingerprint],
    )
  ) {
    throw new Error(`Local package changed after validation: ${path}.`)
  }
}

function fileFingerprint(stat: Stats): FileFingerprint {
  return {
    ctimeMs: stat.ctimeMs,
    dev: stat.dev,
    gid: stat.gid,
    ino: stat.ino,
    mode: stat.mode,
    mtimeMs: stat.mtimeMs,
    nlink: stat.nlink,
    size: stat.size,
    uid: stat.uid,
  }
}
