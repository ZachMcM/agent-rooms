import {
  AgentHarnessIcon,
  type AgentHarness,
} from '@agent-rooms/ui-library/components/agent-harness-icon'
import { Card, CardContent, CardHeader } from '@agent-rooms/ui-library/components/card'
import { MessageKindBadge } from '@agent-rooms/ui-library/components/message-kind-badge'
import { ScrollArea } from '@agent-rooms/ui-library/components/scroll-area'
import { Separator } from '@agent-rooms/ui-library/components/separator'
import { Skeleton } from '@agent-rooms/ui-library/components/skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { RiCornerDownRightLine } from 'react-icons/ri'

import type { RoomDetail } from '../../api'
import { roomDetailQueryOptions } from '../../queries'
import { RoomDetailsSidebar } from '../../room-details-sidebar'
import { formatRelativeTime, getRoomTimeline, type RoomTimelineItem } from '../../room-timeline'

export const Route = createFileRoute('/rooms/$roomId')({ component: RoomPage })

function RoomPage() {
  const { roomId } = Route.useParams()
  const queryClient = useQueryClient()
  const room = useQuery(roomDetailQueryOptions(queryClient, roomId))

  return (
    <section className="grid min-h-0 w-full flex-1 grid-cols-1 gap-6 p-4 lg:p-6 xl:h-[calc(100dvh-4rem)] xl:flex-none xl:grid-cols-[minmax(0,1fr)_20rem] xl:overflow-hidden">
      {room.isPending ? <RoomPageSkeleton /> : null}
      {room.isError ? <RoomPageError /> : null}
      {room.data ? <RoomDetailContent room={room.data} /> : null}
    </section>
  )
}

function RoomDetailContent({ room }: { room: RoomDetail }) {
  const timeline = getRoomTimeline(room.room, room.messages, room.events)

  return (
    <>
      <div className="min-h-0">
        <ScrollArea className="h-full">
          <ol className="space-y-8 px-2 py-4 sm:px-4">
            {timeline.map((item) => (
              <TimelineItem key={getTimelineItemKey(item)} item={item} />
            ))}
            {room.messages.length === 0 ? (
              <li className="flex min-h-44 items-center justify-center px-6 text-center">
                <div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Messages shared in this room will appear here.
                  </p>
                </div>
              </li>
            ) : null}
          </ol>
        </ScrollArea>
      </div>
      <RoomDetailsSidebar room={room.room} messages={room.messages} members={room.members} />
    </>
  )
}

function TimelineItem({ item }: { item: RoomTimelineItem }) {
  if (item.type === 'message') return <MessageItem item={item} />

  const text =
    item.type === 'room-created'
      ? 'Room created'
      : `${item.event.membership.conversationId} ${item.event.kind === 'join' ? 'joined' : 'left'}`

  return (
    <li className="text-muted-foreground flex items-center gap-3 text-xs">
      <Separator className="flex-1" />
      <span className="min-w-0 text-center break-all">{text}</span>
      <span className="shrink-0 text-[11px]">{formatRelativeTime(item.createdAt)}</span>
      <Separator className="flex-1" />
    </li>
  )
}

function MessageItem({ item }: { item: Extract<RoomTimelineItem, { type: 'message' }> }) {
  const { message } = item

  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
      <AgentHarnessIcon
        harness={resolveAgentHarness(message.membership.conversationId)}
        className="mt-0.5"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="min-w-0 font-medium break-all">{message.membership.conversationId}</span>
          <MessageKindBadge kind={message.kind} />
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>
        {message.kind === 'answer' && message.replyTo ? (
          <div className="bg-secondary text-muted-foreground mt-2 flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs">
            <RiCornerDownRightLine className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere whitespace-pre-wrap">
              answers #{message.replyTo.id} {message.replyTo.body}
            </span>
          </div>
        ) : null}
        <p className="mt-2 min-w-0 text-sm leading-6 wrap-anywhere whitespace-pre-wrap">
          <span className="text-muted-foreground">#{message.id}</span> {message.body}
        </p>
      </div>
    </li>
  )
}

function getTimelineItemKey(item: RoomTimelineItem) {
  if (item.type === 'room-created') return 'room-created'
  if (item.type === 'event') return `event-${item.event.id}`
  return `message-${item.message.id}`
}

function resolveAgentHarness(conversationId: string): AgentHarness {
  if (conversationId.startsWith('claude-')) return 'claude-code'
  if (conversationId.startsWith('codex-')) return 'codex'
  if (conversationId.startsWith('cursor-')) return 'cursor'
  if (conversationId.startsWith('gemini-')) return 'gemini-cli'
  return 'unknown'
}

function RoomPageSkeleton() {
  return (
    <>
      <div className="space-y-5 px-2 py-4 sm:px-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    </>
  )
}

function RoomPageError() {
  return (
    <div className="flex min-h-52 items-center justify-center px-6 text-center xl:col-span-2">
      <div>
        <p className="text-sm font-medium">Unable to load room</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Check that the Agent Rooms dashboard is running and try again.
        </p>
      </div>
    </div>
  )
}
