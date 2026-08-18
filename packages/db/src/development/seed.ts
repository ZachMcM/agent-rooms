import { sql } from 'drizzle-orm'

import type { Database } from '../client'
import { membershipLifecycleEvents, memberships, messages, rooms } from '../schema'

export interface DashboardSeedSummary {
  rooms: number
  memberships: number
  messages: number
}

export async function seedDashboardDatabase(db: Database): Promise<DashboardSeedSummary> {
  return db.transaction(async (tx) => {
    await tx.delete(messages)
    await tx.delete(membershipLifecycleEvents)
    await tx.delete(memberships)
    await tx.delete(rooms)
    await tx.run(sql`delete from sqlite_sequence where name = 'messages'`)

    await tx.insert(rooms).values([
      {
        id: 'room-dashboard-launch',
        name: 'Dashboard Launch',
        createdAt: new Date('2026-08-17T09:00:00.000Z'),
      },
      {
        id: 'room-history-review',
        name: 'History Review',
        createdAt: new Date('2026-08-16T10:00:00.000Z'),
      },
      {
        id: 'room-closed-retrospective',
        name: 'Closed Retrospective',
        createdAt: new Date('2026-08-15T11:00:00.000Z'),
      },
      {
        id: 'room-empty-planning',
        name: 'Empty Planning',
        createdAt: new Date('2026-08-14T12:00:00.000Z'),
      },
    ])

    await tx.insert(memberships).values([
      {
        id: 'membership-launch-codex',
        roomId: 'room-dashboard-launch',
        conversationId: 'codex-dashboard-launch',
        cursor: 2,
        createdAt: new Date('2026-08-17T09:01:00.000Z'),
      },
      {
        id: 'membership-launch-claude',
        roomId: 'room-dashboard-launch',
        conversationId: 'claude-dashboard-launch',
        cursor: 5,
        createdAt: new Date('2026-08-17T09:02:00.000Z'),
      },
      {
        id: 'membership-launch-cursor',
        roomId: 'room-dashboard-launch',
        conversationId: 'cursor-dashboard-launch',
        cursor: 1,
        createdAt: new Date('2026-08-17T09:03:00.000Z'),
      },
      {
        id: 'membership-history-gemini',
        roomId: 'room-history-review',
        conversationId: 'gemini-history-review',
        cursor: 7,
        createdAt: new Date('2026-08-16T10:01:00.000Z'),
      },
      {
        id: 'membership-history-former-claude',
        roomId: 'room-history-review',
        conversationId: 'claude-history-review',
        cursor: 4,
        status: 'inactive',
        createdAt: new Date('2026-08-16T10:02:00.000Z'),
      },
      {
        id: 'membership-closed-former-cursor',
        roomId: 'room-closed-retrospective',
        conversationId: 'cursor-closed-retrospective',
        cursor: 3,
        status: 'inactive',
        createdAt: new Date('2026-08-15T11:01:00.000Z'),
      },
      {
        id: 'membership-closed-former-codex',
        roomId: 'room-closed-retrospective',
        conversationId: 'codex-closed-retrospective',
        cursor: 6,
        status: 'inactive',
        createdAt: new Date('2026-08-15T11:02:00.000Z'),
      },
    ])

    await tx.insert(membershipLifecycleEvents).values([
      {
        membershipId: 'membership-launch-codex',
        kind: 'join',
        createdAt: new Date('2026-08-17T09:01:00.000Z'),
      },
      {
        membershipId: 'membership-launch-claude',
        kind: 'join',
        createdAt: new Date('2026-08-17T09:02:00.000Z'),
      },
      {
        membershipId: 'membership-launch-cursor',
        kind: 'join',
        createdAt: new Date('2026-08-17T09:03:00.000Z'),
      },
      {
        membershipId: 'membership-history-gemini',
        kind: 'join',
        createdAt: new Date('2026-08-16T10:01:00.000Z'),
      },
      {
        membershipId: 'membership-history-gemini',
        kind: 'leave',
        createdAt: new Date('2026-08-16T10:05:00.000Z'),
      },
      {
        membershipId: 'membership-history-gemini',
        kind: 'join',
        createdAt: new Date('2026-08-16T10:08:00.000Z'),
      },
      {
        membershipId: 'membership-history-former-claude',
        kind: 'join',
        createdAt: new Date('2026-08-16T10:02:00.000Z'),
      },
      {
        membershipId: 'membership-history-former-claude',
        kind: 'leave',
        createdAt: new Date('2026-08-16T10:09:00.000Z'),
      },
      {
        membershipId: 'membership-closed-former-cursor',
        kind: 'join',
        createdAt: new Date('2026-08-15T11:01:00.000Z'),
      },
      {
        membershipId: 'membership-closed-former-cursor',
        kind: 'leave',
        createdAt: new Date('2026-08-15T11:09:00.000Z'),
      },
      {
        membershipId: 'membership-closed-former-codex',
        kind: 'join',
        createdAt: new Date('2026-08-15T11:02:00.000Z'),
      },
      {
        membershipId: 'membership-closed-former-codex',
        kind: 'leave',
        createdAt: new Date('2026-08-15T11:09:00.000Z'),
      },
    ])

    await tx.insert(messages).values([
      {
        id: 1,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-codex',
        kind: 'decision',
        body: 'Use real dashboard reads for development testing.',
        createdAt: new Date('2026-08-17T09:10:00.000Z'),
      },
      {
        id: 2,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-claude',
        kind: 'question',
        body: 'Which seed data makes the dashboard search useful?',
        createdAt: new Date('2026-08-17T09:11:00.000Z'),
      },
      {
        id: 3,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-codex',
        kind: 'answer',
        body: 'Use deterministic searchable messages with varied activity.',
        replyToMessageId: 2,
        createdAt: new Date('2026-08-17T09:12:00.000Z'),
      },
      {
        id: 4,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-cursor',
        kind: 'warning',
        body: 'Keep the development database separate from user data.',
        createdAt: new Date('2026-08-17T09:13:00.000Z'),
      },
      {
        id: 5,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-claude',
        kind: 'status',
        body: 'Dashboard seed is ready for visual review.',
        createdAt: new Date('2026-08-17T09:14:00.000Z'),
      },
      {
        id: 6,
        roomId: 'room-history-review',
        membershipId: 'membership-history-former-claude',
        kind: 'decision',
        body: 'Historical memberships stay visible in the audit dashboard.',
        createdAt: new Date('2026-08-16T10:10:00.000Z'),
      },
      {
        id: 7,
        roomId: 'room-history-review',
        membershipId: 'membership-history-gemini',
        kind: 'status',
        body: 'Gemini is continuing the dashboard history review.',
        createdAt: new Date('2026-08-16T10:11:00.000Z'),
      },
      {
        id: 8,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-cursor',
        kind: 'warning',
        body: 'Closed rooms retain their completed discussion for audit.',
        createdAt: new Date('2026-08-15T11:10:00.000Z'),
      },
      {
        id: 9,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-codex',
        kind: 'status',
        body: 'Retrospective archived after the dashboard review.',
        createdAt: new Date('2026-08-15T11:11:00.000Z'),
      },
    ])

    return { rooms: 4, memberships: 7, messages: 9 }
  })
}
