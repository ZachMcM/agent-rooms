import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

import { roomDetailQueryOptions } from '../../queries'

export const Route = createFileRoute('/rooms/$roomId')({ component: RoomPage })

function RoomPage() {
  const { roomId } = Route.useParams()
  const queryClient = useQueryClient()
  const room = useQuery(roomDetailQueryOptions(queryClient, roomId))

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Link to="/" className="text-muted-foreground text-sm hover:underline">
        Rooms
      </Link>
      {room.isPending ? <p className="text-muted-foreground mt-8 text-sm">Loading room…</p> : null}
      {room.isError ? <p className="text-destructive mt-8 text-sm">Unable to load room.</p> : null}
      {room.data ? (
        <>
          <h1 className="mt-6 border-b pb-4 text-xl font-semibold tracking-tight">
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
    </main>
  )
}
