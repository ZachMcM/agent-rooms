import {
  AgentHarnessIcon,
  type AgentHarness,
} from '@agent-rooms/ui-library/components/agent-harness-icon'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@agent-rooms/ui-library/components/empty'
import { Marker, MarkerContent } from '@agent-rooms/ui-library/components/marker'
import { MessageKindPill } from '@agent-rooms/ui-library/components/message-kind-pill'
import { ScrollArea } from '@agent-rooms/ui-library/components/scroll-area'
import { Skeleton } from '@agent-rooms/ui-library/components/skeleton'
import { Send } from '@agent-rooms/ui-library/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { RiCornerDownRightLine } from 'react-icons/ri'
import ReactMarkdown from 'react-markdown'

import type { RoomDetail } from '../../api'
import { roomDetailQueryOptions } from '../../queries'
import { RoomDetailsSidebar, RoomDetailsSidebarSkeleton } from '../../room-details-sidebar'
import { messageFragment, parseMessageFragment } from '../../room-navigation'
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
  const hash = useLocation({ select: (location) => location.hash })
  const handledHash = useRef<string | null>(null)
  const previousMessages = useRef<{ roomId: string; ids: Set<number> } | null>(null)
  const timeline = getRoomTimeline(room.room, room.messages, room.events)
  const messageIds = room.messages.map((message) => message.id).join(',')

  useEffect(() => {
    const messageId = parseMessageFragment(hash)
    if (messageId === null) {
      handledHash.current = null
      return
    }
    if (handledHash.current === hash) return

    const target = document.getElementById(messageFragment(messageId))
    if (!target) return

    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    })
    handledHash.current = hash
  }, [hash, messageIds])

  useEffect(() => {
    const currentIds = new Set(room.messages.map((message) => message.id))
    const previous = previousMessages.current
    previousMessages.current = { roomId: room.room.id, ids: currentIds }

    if (!previous || previous.roomId !== room.room.id || parseMessageFragment(hash) !== null) return

    const latestNewMessage = room.messages.findLast((message) => !previous.ids.has(message.id))
    if (!latestNewMessage) return

    document.getElementById(messageFragment(latestNewMessage.id))?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [hash, messageIds, room.messages, room.room.id])

  return (
    <>
      <div className="min-h-0">
        <ScrollArea className="h-full">
          <ol className="space-y-8 px-2 py-4 sm:px-4">
            {timeline.map((item) => (
              <TimelineItem key={getTimelineItemKey(item)} item={item} roomId={room.room.id} />
            ))}
            {room.messages.length === 0 ? (
              <li className="flex min-h-44 items-center justify-center px-6">
                <Empty className="min-h-44 border-0 p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Send aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle className="text-base">No messages shared</EmptyTitle>
                    <EmptyDescription>
                      Messages shared with this room will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </li>
            ) : null}
          </ol>
        </ScrollArea>
      </div>
      <RoomDetailsSidebar room={room.room} messages={room.messages} members={room.members} />
    </>
  )
}

function TimelineItem({ item, roomId }: { item: RoomTimelineItem; roomId: string }) {
  if (item.type === 'message') return <MessageItem item={item} roomId={roomId} />

  const { text } =
    item.type === 'room-created'
      ? { text: 'Room created' }
      : item.event.kind === 'join'
        ? { text: `${item.event.membership.conversationId} joined` }
        : { text: `${item.event.membership.conversationId} left` }

  return (
    <Marker variant="separator" className="text-xs">
      <MarkerContent className="max-w-[calc(100%-3rem)]">
        <span className="break-all">{text}</span>{' '}
        <span className="shrink-0 text-[11px]">{formatRelativeTime(item.createdAt)}</span>
      </MarkerContent>
    </Marker>
  )
}

function MessageItem({
  item,
  roomId,
}: {
  item: Extract<RoomTimelineItem, { type: 'message' }>
  roomId: string
}) {
  const { message } = item

  return (
    <li id={messageFragment(message.id)} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
      <AgentHarnessIcon harness={resolveAgentHarness(message.membership.conversationId)} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="min-w-0 font-medium break-all">{message.membership.conversationId}</span>
          <MessageKindPill kind={message.kind} />
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>
        {message.kind === 'answer' && message.replyTo ? (
          <div className="bg-secondary text-muted-foreground mt-2 flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs">
            <RiCornerDownRightLine className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <Link
              to="/rooms/$roomId"
              params={{ roomId }}
              hash={messageFragment(message.replyTo.id)}
              hashScrollIntoView={false}
              resetScroll={false}
              className="hover:text-foreground focus-visible:text-foreground min-w-0 wrap-anywhere underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              answers: {message.replyTo.body}
            </Link>
          </div>
        ) : null}
        <div className="message-content [&_a]:text-foreground [&_code]:bg-secondary [&_pre]:bg-secondary/70 mt-2 min-w-0 text-base leading-6 wrap-anywhere [&_a]:underline-offset-2 [&_a:hover]:underline [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.85em] [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:px-3 [&_pre]:py-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[0.9em] [&_pre_code]:leading-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&>p:first-of-type]:m-0 [&>p:first-of-type]:inline">
          <Link
            to="/rooms/$roomId"
            params={{ roomId }}
            hash={messageFragment(message.id)}
            hashScrollIntoView={false}
            resetScroll={false}
            aria-label={`Link to message ${message.id}`}
            className="sr-only"
          >
            #{message.id}:
          </Link>{' '}
          <ReactMarkdown>{message.body}</ReactMarkdown>
        </div>
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
  if (conversationId.startsWith('opencode-')) return 'opencode'
  return 'unknown'
}

function RoomPageSkeleton() {
  return (
    <>
      <div className="min-h-0" role="status" aria-label="Loading messages" aria-busy="true">
        <ScrollArea className="h-full">
          <ol className="space-y-8 px-2 py-4 sm:px-4" aria-hidden="true">
            <MessageTimelineSkeleton />
          </ol>
        </ScrollArea>
      </div>
      <RoomDetailsSidebarSkeleton />
    </>
  )
}

function MessageTimelineSkeleton() {
  return (
    <>
      <li className="flex items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-px flex-1" />
      </li>
      <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
        <Skeleton className="mt-0.5 size-8 rounded-lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </li>
      <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
        <Skeleton className="mt-0.5 size-8 rounded-lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="bg-secondary mt-2 rounded-md px-2.5 py-1.5">
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
      </li>
      <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
        <Skeleton className="mt-0.5 size-8 rounded-lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-18 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </li>
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
