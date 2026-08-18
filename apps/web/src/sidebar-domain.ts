import type { RoomOverview } from './api'

export type RoomStatusFilter = 'all' | 'active' | 'closed'
export type RoomActivityFilter = '1d' | '3d' | '7d' | '30d' | 'all'
export type RoomGroupBy = 'date' | 'status' | 'none'

export interface SidebarFilters {
  status: RoomStatusFilter
  lastActivity: RoomActivityFilter
  groupBy: RoomGroupBy
}

export interface RoomGroup {
  heading: string | null
  rooms: RoomOverview[]
}

export const defaultSidebarFilters: SidebarFilters = {
  status: 'active',
  lastActivity: 'all',
  groupBy: 'date',
}

export function isRoomActive(room: RoomOverview) {
  return room.members.some((member) => member.status === 'active')
}

export function getActivityCutoff(filter: RoomActivityFilter, now = new Date()) {
  if (filter === 'all') return null

  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (filter === '3d') cutoff.setDate(cutoff.getDate() - 2)
  if (filter === '7d') cutoff.setDate(cutoff.getDate() - 6)
  if (filter === '30d') cutoff.setDate(cutoff.getDate() - 29)
  return cutoff
}

export function filterRooms(rooms: RoomOverview[], filters: SidebarFilters, now = new Date()) {
  const cutoff = getActivityCutoff(filters.lastActivity, now)

  return rooms.filter((room) => {
    const matchesStatus =
      filters.status === 'all' || isRoomActive(room) === (filters.status === 'active')
    const matchesActivity = cutoff === null || new Date(room.lastActivityAt) >= cutoff

    return matchesStatus && matchesActivity
  })
}

export function sortRooms(rooms: RoomOverview[]) {
  return rooms.toSorted((left, right) => {
    const activityDifference =
      new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime()
    if (activityDifference !== 0) return activityDifference

    const nameComparison = left.room.name.localeCompare(right.room.name)
    if (nameComparison !== 0) return nameComparison

    return left.room.id.localeCompare(right.room.id)
  })
}

export function getRoomGroups(
  rooms: RoomOverview[],
  groupBy: RoomGroupBy,
  now = new Date(),
): RoomGroup[] {
  const sortedRooms = sortRooms(rooms)

  if (groupBy === 'none') return [{ heading: null, rooms: sortedRooms }]

  if (groupBy === 'status') {
    return [
      { heading: 'Active', rooms: sortedRooms.filter(isRoomActive) },
      { heading: 'Closed', rooms: sortedRooms.filter((room) => !isRoomActive(room)) },
    ].filter((group) => group.rooms.length > 0)
  }

  const groups = new Map<string, RoomOverview[]>()
  for (const room of sortedRooms) {
    const key = localDayKey(new Date(room.lastActivityAt))
    const group = groups.get(key)
    if (group) group.push(room)
    else groups.set(key, [room])
  }

  return [...groups.entries()].map(([_key, groupedRooms]) => ({
    heading: formatDateHeading(new Date(groupedRooms[0]!.lastActivityAt), now),
    rooms: groupedRooms,
  }))
}

export function formatDateHeading(date: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000)

  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function localDayKey(date: Date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-')
}
