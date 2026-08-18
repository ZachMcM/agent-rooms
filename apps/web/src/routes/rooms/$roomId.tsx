import { Card, CardContent, CardHeader } from '@agent-rooms/ui-library/components/card'
import { ScrollArea } from '@agent-rooms/ui-library/components/scroll-area'
import { Skeleton } from '@agent-rooms/ui-library/components/skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import type { RoomDetail } from '../../api'
import { roomDetailQueryOptions } from '../../queries'
import { RoomDetailsSidebar } from '../../room-details-sidebar'

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
  return (
    <>
      <div className="min-h-0">
        <ScrollArea className="h-full">
          {room.messages.length > 0 ? (
            <ol className="divide-y">
              {room.messages.map((message) => (
                <li key={message.id} className="px-2 py-4 sm:px-4">
                  <p className="text-sm leading-6 whitespace-pre-wrap">{message.body}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex h-full min-h-52 items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Messages shared in this room will appear here.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
      <RoomDetailsSidebar room={room.room} messages={room.messages} members={room.members} />
    </>
  )
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
