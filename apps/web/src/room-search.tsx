import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@coordrooms/ui-library/components/command'
import { MessageKindPill } from '@coordrooms/ui-library/components/message-kind-pill'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { searchQueryOptions } from './queries'
import { messageFragment } from './room-navigation'

export function RoomSearch({ open, onOpenChange }: RoomSearchProps) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const trimmedTerm = term.trim()
  const hasTerm = trimmedTerm !== ''
  const search = useQuery(
    searchQueryOptions(open && hasTerm && debouncedTerm ? { query: debouncedTerm } : undefined),
  )
  const isDebouncing = hasTerm && trimmedTerm !== debouncedTerm

  useEffect(() => {
    if (!open) return

    const timeout = window.setTimeout(() => setDebouncedTerm(trimmedTerm), 250)
    return () => window.clearTimeout(timeout)
  }, [open, trimmedTerm])

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setTerm('')
      setDebouncedTerm('')
    }
  }

  function selectRoom(roomId: string) {
    handleOpenChange(false)
    navigate({ to: '/rooms/$roomId', params: { roomId } })
  }

  function selectMessage(roomId: string, messageId: number) {
    handleOpenChange(false)
    navigate({
      to: '/rooms/$roomId',
      params: { roomId },
      hash: messageFragment(messageId),
      hashScrollIntoView: false,
      resetScroll: false,
    })
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search rooms"
      description="Search room names and messages."
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={term}
          onValueChange={setTerm}
          placeholder="Search rooms and messages..."
        />
        <CommandList>
          {!hasTerm ? <SearchStatus>Type to search rooms and messages.</SearchStatus> : null}
          {isDebouncing ? <SearchStatus>Searching...</SearchStatus> : null}
          {hasTerm && !isDebouncing && search.isPending ? (
            <SearchStatus>Searching...</SearchStatus>
          ) : null}
          {hasTerm && !isDebouncing && search.isError ? (
            <SearchStatus>Could not search rooms. Try again.</SearchStatus>
          ) : null}
          {hasTerm && !isDebouncing && search.data ? (
            <>
              {search.data.rooms.length === 0 && search.data.messages.length === 0 ? (
                <SearchStatus>No results found.</SearchStatus>
              ) : null}
              {search.data.rooms.length > 0 ? (
                <CommandGroup heading="Rooms">
                  {search.data.rooms.map((room) => (
                    <CommandItem
                      key={room.id}
                      value={`room-${room.id}`}
                      onSelect={() => selectRoom(room.id)}
                    >
                      <span className="truncate">{room.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {search.data.messages.length > 0 ? (
                <CommandGroup heading="Messages">
                  {search.data.messages.map(({ room, member, message }) => (
                    <CommandItem
                      key={message.id}
                      value={`message-${message.id}`}
                      onSelect={() => selectMessage(room.id, message.id)}
                      className="items-start"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{room.name}</span>
                          <MessageKindPill kind={message.kind} />
                        </div>
                        <div className="text-muted-foreground mt-1 flex gap-2 text-xs">
                          <span className="shrink-0">{member.conversationId}</span>
                          <span className="truncate">{message.body}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function SearchStatus({ children }: { children: string }) {
  return <p className="text-muted-foreground px-4 py-6 text-center text-sm">{children}</p>
}

interface RoomSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
