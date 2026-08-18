import { describe, expect, it } from 'vitest'

import type { Room, RoomMessage, RoomTimelineEvent } from './api'
import { formatRelativeTime, getRoomTimeline } from './room-timeline'

const room: Room = { id: 'room-1', name: 'Launch', createdAt: '2026-08-18T09:00:00.000Z' }
const member = { id: 'member-1', conversationId: 'codex-session', status: 'active' as const }

function message(id: number, createdAt: string): RoomMessage {
  return { id, kind: 'status', body: 'Ready', createdAt, membership: member, replyTo: null }
}

function event(id: number, kind: RoomTimelineEvent['kind'], createdAt: string): RoomTimelineEvent {
  return { id, kind, createdAt, membership: member }
}

describe('room timeline', () => {
  it('orders lifecycle and message entries chronologically with stable timestamp ties', () => {
    const timeline = getRoomTimeline(
      room,
      [message(3, '2026-08-18T10:00:00.000Z'), message(2, '2026-08-18T09:30:00.000Z')],
      [event(4, 'leave', '2026-08-18T10:00:00.000Z'), event(1, 'join', '2026-08-18T09:00:00.000Z')],
    )

    expect(timeline.map((item) => item.type)).toEqual([
      'room-created',
      'event',
      'message',
      'message',
      'event',
    ])
    expect(timeline.map((item) => (item.type === 'event' ? item.event.kind : item.type))).toEqual([
      'room-created',
      'join',
      'message',
      'message',
      'leave',
    ])
  })

  it('formats compact relative timestamps', () => {
    const now = new Date('2026-08-18T12:00:00.000Z')

    expect(formatRelativeTime('2026-08-18T11:59:30.000Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-08-18T11:45:00.000Z', now)).toBe('15m ago')
    expect(formatRelativeTime('2026-08-18T10:00:00.000Z', now)).toBe('2h ago')
    expect(formatRelativeTime('2026-08-16T12:00:00.000Z', now)).toBe('2d ago')
  })
})
