import { describe, expect, it } from 'vitest'

import type { RoomOverview } from './api'
import {
  defaultSidebarFilters,
  filterRooms,
  formatDateHeading,
  getRoomGroups,
  isRoomActive,
  sortRooms,
} from './sidebar-domain'

const now = new Date(2026, 7, 17, 15, 30)

function makeRoom(
  id: string,
  name: string,
  lastActivityAt: string,
  status: 'active' | 'inactive' = 'active',
): RoomOverview {
  return {
    room: { id, name, createdAt: lastActivityAt },
    members: [{ id: `${id}-member`, conversationId: id, status }],
    lastActivityAt,
  }
}

const rooms = [
  makeRoom('active', 'Active', new Date(2026, 7, 17, 16).toISOString()),
  makeRoom('closed', 'Closed', new Date(2026, 7, 17, 15).toISOString(), 'inactive'),
]

describe('sidebar domain', () => {
  it('treats rooms with any active membership as active', () => {
    expect(isRoomActive(rooms[0]!)).toBe(true)
    expect(isRoomActive(rooms[1]!)).toBe(false)
  })

  it('filters rooms by membership status', () => {
    expect(filterRooms(rooms, { ...defaultSidebarFilters, status: 'all' }, now)).toHaveLength(2)
    expect(
      filterRooms(rooms, defaultSidebarFilters, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual(['active'])
    expect(
      filterRooms(rooms, { ...defaultSidebarFilters, status: 'closed' }, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual(['closed'])
  })

  it('filters activity using inclusive local calendar-day cutoffs', () => {
    const activityRooms = [
      makeRoom('today-start', 'Today start', new Date(2026, 7, 17, 0).toISOString()),
      makeRoom(
        'one-before',
        'One day before',
        new Date(2026, 7, 16, 23, 59, 59, 999).toISOString(),
      ),
      makeRoom('three-start', 'Three day start', new Date(2026, 7, 15, 0).toISOString()),
      makeRoom(
        'three-before',
        'Three day before',
        new Date(2026, 7, 14, 23, 59, 59, 999).toISOString(),
      ),
      makeRoom('seven-start', 'Seven start', new Date(2026, 7, 11, 0).toISOString()),
      makeRoom(
        'seven-before',
        'Seven before',
        new Date(2026, 7, 10, 23, 59, 59, 999).toISOString(),
      ),
      makeRoom('thirty-start', 'Thirty start', new Date(2026, 6, 19, 0).toISOString()),
      makeRoom(
        'thirty-before',
        'Thirty before',
        new Date(2026, 6, 18, 23, 59, 59, 999).toISOString(),
      ),
    ]

    expect(
      filterRooms(activityRooms, { ...defaultSidebarFilters, lastActivity: '1d' }, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual(['today-start'])
    expect(
      filterRooms(activityRooms, { ...defaultSidebarFilters, lastActivity: '3d' }, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual(['today-start', 'one-before', 'three-start'])
    expect(
      filterRooms(activityRooms, { ...defaultSidebarFilters, lastActivity: '7d' }, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual(['today-start', 'one-before', 'three-start', 'three-before', 'seven-start'])
    expect(
      filterRooms(activityRooms, { ...defaultSidebarFilters, lastActivity: '30d' }, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual([
      'today-start',
      'one-before',
      'three-start',
      'three-before',
      'seven-start',
      'seven-before',
      'thirty-start',
    ])
    expect(
      filterRooms(activityRooms, { ...defaultSidebarFilters, lastActivity: 'all' }, now).map(
        ({ room: overviewRoom }) => overviewRoom.id,
      ),
    ).toEqual([
      'today-start',
      'one-before',
      'three-start',
      'three-before',
      'seven-start',
      'seven-before',
      'thirty-start',
      'thirty-before',
    ])
  })

  it('orders rooms by activity, then name and id', () => {
    expect(
      sortRooms([
        makeRoom('b', 'Beta', new Date(2026, 7, 17, 16).toISOString()),
        makeRoom('a', 'Beta', new Date(2026, 7, 17, 16).toISOString()),
        makeRoom('c', 'Alpha', new Date(2026, 7, 17, 16).toISOString()),
        makeRoom('d', 'Later', new Date(2026, 7, 17, 17).toISOString()),
      ]).map(({ room: overviewRoom }) => overviewRoom.id),
    ).toEqual(['d', 'c', 'a', 'b'])
  })

  it('groups by local date, status, or without headings', () => {
    const groupedRooms = [
      makeRoom('today', 'Today', new Date(2026, 7, 17, 16).toISOString()),
      makeRoom('yesterday', 'Yesterday', new Date(2026, 7, 16, 16).toISOString()),
      makeRoom('older', 'Older', new Date(2026, 7, 14, 16).toISOString(), 'inactive'),
    ]

    expect(getRoomGroups(groupedRooms, 'date', now).map(({ heading }) => heading)).toEqual([
      'Today',
      'Yesterday',
      'Aug 14',
    ])
    expect(getRoomGroups(groupedRooms, 'status', now).map(({ heading }) => heading)).toEqual([
      'Active',
      'Closed',
    ])
    expect(getRoomGroups(groupedRooms, 'none', now)).toEqual([
      { heading: null, rooms: sortRooms(groupedRooms) },
    ])
  })

  it('uses local-date headings and exposes the reset defaults', () => {
    expect(formatDateHeading(new Date(2026, 7, 17, 0), now)).toBe('Today')
    expect(formatDateHeading(new Date(2026, 7, 16, 23, 59), now)).toBe('Yesterday')
    expect(defaultSidebarFilters).toEqual({
      status: 'active',
      lastActivity: 'all',
      groupBy: 'date',
    })
  })
})
