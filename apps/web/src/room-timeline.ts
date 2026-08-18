import type { Room, RoomMessage, RoomTimelineEvent } from './api'

export type RoomTimelineItem =
  | { type: 'room-created'; createdAt: string }
  | { type: 'event'; event: RoomTimelineEvent; createdAt: string }
  | { type: 'message'; message: RoomMessage; createdAt: string }

export function getRoomTimeline(
  room: Room,
  messages: RoomMessage[],
  events: RoomTimelineEvent[],
): RoomTimelineItem[] {
  return [
    { type: 'room-created' as const, createdAt: room.createdAt },
    ...events.map((event) => ({ type: 'event' as const, event, createdAt: event.createdAt })),
    ...messages.map((message) => ({
      type: 'message' as const,
      message,
      createdAt: message.createdAt,
    })),
  ].toSorted(compareTimelineItems)
}

export function formatRelativeTime(value: string, now = new Date()) {
  const elapsed = Math.max(0, now.getTime() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function compareTimelineItems(left: RoomTimelineItem, right: RoomTimelineItem) {
  const timeDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  if (timeDifference !== 0) return timeDifference

  const typeDifference = timelineTypeRank(left) - timelineTypeRank(right)
  if (typeDifference !== 0) return typeDifference

  return timelineItemId(left) - timelineItemId(right)
}

function timelineTypeRank(item: RoomTimelineItem) {
  if (item.type === 'room-created') return 0
  if (item.type === 'event') return item.event.kind === 'join' ? 1 : 3
  return 2
}

function timelineItemId(item: RoomTimelineItem) {
  if (item.type === 'room-created') return 0
  if (item.type === 'event') return item.event.id
  return item.message.id
}
