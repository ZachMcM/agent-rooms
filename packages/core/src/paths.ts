import { homedir } from 'node:os'
import { join } from 'node:path'

export const DATA_DIR_NAME = '.coordrooms'
export const DB_FILE_NAME = 'db.sqlite'

// User-global, not project-local: parallel agents commonly run in separate git worktrees, and a
// project-local db would give each worktree its own file.
export function dataDir(home: string = homedir()): string {
  return join(home, DATA_DIR_NAME)
}

export function dbFilePath(home: string = homedir()): string {
  return join(dataDir(home), DB_FILE_NAME)
}

export function dbFileUrl(home: string = homedir()): string {
  return `file:${dbFilePath(home)}`
}
