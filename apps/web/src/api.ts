export type MessageKind = 'decision' | 'warning' | 'question' | 'answer' | 'status'

export interface Room {
  id: string
  name: string
  createdAt: string
}

export interface RoomOverviewMember {
  id: string
  conversationId: string
  status: 'active' | 'inactive'
}

export interface RoomOverview {
  room: Room
  members: RoomOverviewMember[]
}

export interface RoomMember extends RoomOverviewMember {
  joinedAt: string
  cursor: number
  messageCounts: Record<MessageKind | 'total', number>
  mostRecentMessage: { id: number; kind: MessageKind; body: string; createdAt: string } | null
}

export interface RoomDetail {
  room: Room
  members: RoomMember[]
  messages: RoomMessage[]
}

export interface RoomMessage {
  id: number
  kind: MessageKind
  body: string
  createdAt: string
  membership: RoomOverviewMember
}

export interface SearchInput {
  query: string
  roomId?: string
  limit?: number
}

export interface SearchResults {
  rooms: Room[]
  messages: Array<{
    room: Pick<Room, 'id' | 'name'>
    member: Pick<RoomOverviewMember, 'id' | 'conversationId'>
    message: Pick<RoomMessage, 'id' | 'kind' | 'body' | 'createdAt'>
  }>
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return response.json() as Promise<T>
}

export function getRoomOverviews(): Promise<RoomOverview[]> {
  return getJson('/api/rooms')
}

export function getRoomDetail(roomId: string): Promise<RoomDetail> {
  return getJson(`/api/rooms/${encodeURIComponent(roomId)}`)
}

export function searchRooms(input: SearchInput): Promise<SearchResults> {
  const params = new URLSearchParams({ query: input.query })
  if (input.roomId) params.set('roomId', input.roomId)
  if (input.limit !== undefined) params.set('limit', String(input.limit))
  return getJson(`/api/search?${params}`)
}
