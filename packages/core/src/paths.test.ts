import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DATA_DIR_NAME, DB_FILE_NAME, dataDir, dbFilePath, dbFileUrl } from './paths'

describe('paths', () => {
  it('resolves the data dir under the supplied home dir', () => {
    expect(dataDir('/home/zach')).toBe(join('/home/zach', DATA_DIR_NAME))
  })

  it('resolves the db file inside the data dir', () => {
    expect(dbFilePath('/home/zach')).toBe(join('/home/zach', DATA_DIR_NAME, DB_FILE_NAME))
  })

  it('prefixes the db url with the libsql file scheme', () => {
    expect(dbFileUrl('/home/zach')).toBe(`file:${join('/home/zach', DATA_DIR_NAME, DB_FILE_NAME)}`)
  })

  it('does not resolve relative to the current working directory', () => {
    expect(dbFilePath('/home/zach')).not.toContain(process.cwd())
  })
})
