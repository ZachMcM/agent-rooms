import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { asc, eq, sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase, type Database } from './client'
import { membershipLifecycleEvents, memberships } from './schema'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function executeMigration(db: Database, name: string) {
  const source = await readFile(
    fileURLToPath(new URL(`../migrations/${name}/migration.sql`, import.meta.url)),
    'utf8',
  )

  await executeStatements(db, source.split('--> statement-breakpoint'))
}

async function executeStatements(db: Database, statements: string[]) {
  const [statement, ...remaining] = statements

  if (statement === undefined) return
  if (statement.trim()) await db.run(sql.raw(statement))
  await executeStatements(db, remaining)
}

describe('migrations', () => {
  it('backfills a join event for memberships created before lifecycle events existed', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coordrooms-migration-'))
    directories.push(directory)
    const db = await createDatabase(`file:${join(directory, 'db.sqlite')}`)

    await executeMigration(db, '20260813043447_white_raza')
    await executeMigration(db, '20260814233630_lucky_screwball')
    await executeMigration(db, '20260816054726_smooth_calypso')
    await db.run(sql`insert into rooms (id, name) values ('room', 'room')`)
    await db.insert(memberships).values({
      id: 'membership',
      roomId: 'room',
      conversationId: 'conversation',
      createdAt: new Date('2026-08-18T10:00:00.000Z'),
    })

    await executeMigration(db, '20260818192156_numerous_the_santerians')

    await expect(
      db
        .select({
          membershipId: membershipLifecycleEvents.membershipId,
          kind: membershipLifecycleEvents.kind,
          createdAt: membershipLifecycleEvents.createdAt,
        })
        .from(membershipLifecycleEvents)
        .where(eq(membershipLifecycleEvents.membershipId, 'membership'))
        .orderBy(asc(membershipLifecycleEvents.id)),
    ).resolves.toEqual([
      {
        membershipId: 'membership',
        kind: 'join',
        createdAt: new Date('2026-08-18T10:00:00.000Z'),
      },
    ])
  })
})
