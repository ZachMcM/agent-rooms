import { RiMessage3Line } from '@agent-rooms/ui-library/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { roomOverviewsQueryOptions, searchQueryOptions } from '../queries'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState<string>()
  const rooms = useQuery(roomOverviewsQueryOptions)
  const search = useQuery(
    searchQueryOptions(submittedSearch === undefined ? undefined : { query: submittedSearch }),
  )

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <RiMessage3Line aria-hidden="true" className="text-muted-foreground size-5" />
        Agent Rooms
      </header>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedSearch(searchText)
        }}
      >
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
          placeholder="Search rooms and messages"
          aria-label="Search rooms and messages"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-3 text-sm"
        >
          Search
        </button>
      </form>
      {rooms.isPending ? <p className="text-muted-foreground text-sm">Loading rooms…</p> : null}
      {rooms.isError ? <p className="text-destructive text-sm">Unable to load rooms.</p> : null}
      {search.data ? (
        <p className="text-muted-foreground mb-4 text-sm">
          {search.data.rooms.length + search.data.messages.length} results
        </p>
      ) : null}
      <ul className="divide-border divide-y rounded-md border">
        {rooms.data?.map(({ room, members }) => (
          <li key={room.id}>
            <Link
              to="/rooms/$roomId"
              params={{ roomId: room.id }}
              className="hover:bg-muted flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium">{room.name}</span>
              <span className="text-muted-foreground text-sm">{members.length} members</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
