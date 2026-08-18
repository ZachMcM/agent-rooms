import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { roomDetailQueryOptions } from '../../queries'

export const Route = createFileRoute('/rooms/$roomId')({ component: RoomPage })

function RoomPage() {
  const { roomId } = Route.useParams()
  const queryClient = useQueryClient()
  const room = useQuery(roomDetailQueryOptions(queryClient, roomId))

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6">
      {room.isPending ? <p className="text-muted-foreground text-sm">Loading room…</p> : null}
      {room.isError ? <p className="text-destructive text-sm">Unable to load room.</p> : null}
      {room.data ? (
        <>
          <h1 className="border-b pb-4 text-xl font-semibold tracking-tight">
            {room.data.room.name}
          </h1>
          <ol className="divide-border divide-y">
            {room.data.messages.map((message) => (
              <li key={message.id} className="py-4">
                <div className="text-muted-foreground mb-1 text-xs">
                  {message.membership.conversationId} · {message.kind}
                </div>
                <p className="text-sm leading-6">{message.body}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  )
}
