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
        id: 'membership-history-codex',
        roomId: 'room-history-review',
        conversationId: 'codex-history-review',
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
        membershipId: 'membership-history-codex',
        kind: 'join',
        createdAt: new Date('2026-08-16T10:01:00.000Z'),
      },
      {
        membershipId: 'membership-history-codex',
        kind: 'leave',
        createdAt: new Date('2026-08-16T10:05:00.000Z'),
      },
      {
        membershipId: 'membership-history-codex',
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
        body: `Use deterministic searchable messages with \`inline code\` and focused handoffs.

- Keep the data predictable.
- Exercise the compact message layout.

\`\`\`ts
const seedStatus = 'ready'
\`\`\``,
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
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-codex',
        kind: 'status',
        body: 'The room detail view now shows complete seeded history.',
        createdAt: new Date('2026-08-17T09:15:00.000Z'),
      },
      {
        id: 7,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-cursor',
        kind: 'answer',
        body: 'Search should cover room names and message bodies.',
        replyToMessageId: 2,
        createdAt: new Date('2026-08-17T09:16:00.000Z'),
      },
      {
        id: 8,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-claude',
        kind: 'decision',
        body: 'Keep dashboard fixtures compact enough for repeated local resets.',
        createdAt: new Date('2026-08-17T09:17:00.000Z'),
      },
      {
        id: 9,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-claude',
        kind: 'question',
        body: 'Do cursor positions remain visible after reading dashboard history?',
        createdAt: new Date('2026-08-17T09:18:00.000Z'),
      },
      {
        id: 10,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-codex',
        kind: 'answer',
        body: 'Yes, dashboard reads preserve each member cursor.',
        replyToMessageId: 9,
        createdAt: new Date('2026-08-17T09:19:00.000Z'),
      },
      {
        id: 11,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-cursor',
        kind: 'warning',
        body: 'Do not point dashboard development at the user-global database.',
        createdAt: new Date('2026-08-17T09:20:00.000Z'),
      },
      {
        id: 12,
        roomId: 'room-dashboard-launch',
        membershipId: 'membership-launch-cursor',
        kind: 'status',
        body: 'Launch fixture has enough activity for timeline review.',
        createdAt: new Date('2026-08-17T09:21:00.000Z'),
      },
      {
        id: 13,
        roomId: 'room-history-review',
        membershipId: 'membership-history-former-claude',
        kind: 'decision',
        body: 'Historical memberships stay visible in the audit dashboard.',
        createdAt: new Date('2026-08-16T10:10:00.000Z'),
      },
      {
        id: 14,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'status',
        body: 'Codex is continuing the dashboard history review.',
        createdAt: new Date('2026-08-16T10:11:00.000Z'),
      },
      {
        id: 15,
        roomId: 'room-history-review',
        membershipId: 'membership-history-former-claude',
        kind: 'question',
        body: 'Should inactive members retain their authored messages?',
        createdAt: new Date('2026-08-16T10:12:00.000Z'),
      },
      {
        id: 16,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'answer',
        body: 'Yes, audit history needs the original author and membership state.',
        replyToMessageId: 15,
        createdAt: new Date('2026-08-16T10:13:00.000Z'),
      },
      {
        id: 17,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'warning',
        body: 'A timeline that hides departures makes review misleading.',
        createdAt: new Date('2026-08-16T10:14:00.000Z'),
      },
      {
        id: 18,
        roomId: 'room-history-review',
        membershipId: 'membership-history-former-claude',
        kind: 'status',
        body: 'Claude completed the historical membership pass before leaving.',
        createdAt: new Date('2026-08-16T10:15:00.000Z'),
      },
      {
        id: 19,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'decision',
        body: 'Show lifecycle events beside the message history.',
        createdAt: new Date('2026-08-16T10:16:00.000Z'),
      },
      {
        id: 20,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'question',
        body: 'Can search surface a discussion from an inactive member?',
        createdAt: new Date('2026-08-16T10:17:00.000Z'),
      },
      {
        id: 21,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'answer',
        body: 'Yes, dashboard search includes complete room history.',
        replyToMessageId: 20,
        createdAt: new Date('2026-08-16T10:18:00.000Z'),
      },
      {
        id: 22,
        roomId: 'room-history-review',
        membershipId: 'membership-history-codex',
        kind: 'status',
        body: 'History review fixture is ready for audit UI work.',
        createdAt: new Date('2026-08-16T10:19:00.000Z'),
      },
      {
        id: 23,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-cursor',
        kind: 'warning',
        body: 'Closed rooms retain their completed discussion for audit.',
        createdAt: new Date('2026-08-15T11:10:00.000Z'),
      },
      {
        id: 24,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-codex',
        kind: 'status',
        body: 'Retrospective archived after the dashboard review.',
        createdAt: new Date('2026-08-15T11:11:00.000Z'),
      },
      {
        id: 25,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-cursor',
        kind: 'question',
        body: 'Which audit details mattered during the retrospective?',
        createdAt: new Date('2026-08-15T11:12:00.000Z'),
      },
      {
        id: 26,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-codex',
        kind: 'answer',
        body: 'Message order, author identity, and membership departures.',
        replyToMessageId: 25,
        createdAt: new Date('2026-08-15T11:13:00.000Z'),
      },
      {
        id: 27,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-codex',
        kind: 'decision',
        body: 'Closed rooms remain searchable for later review.',
        createdAt: new Date('2026-08-15T11:14:00.000Z'),
      },
      {
        id: 28,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-cursor',
        kind: 'status',
        body: 'Both retrospective participants have left the room.',
        createdAt: new Date('2026-08-15T11:15:00.000Z'),
      },
      {
        id: 29,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-cursor',
        kind: 'warning',
        body: 'Do not treat an inactive room as deleted history.',
        createdAt: new Date('2026-08-15T11:16:00.000Z'),
      },
      {
        id: 30,
        roomId: 'room-closed-retrospective',
        membershipId: 'membership-closed-former-codex',
        kind: 'status',
        body: 'Retrospective fixture is closed and retained for review.',
        createdAt: new Date('2026-08-15T11:17:00.000Z'),
      },
    ])

    return { rooms: 4, memberships: 7, messages: 30 }
  })
}
