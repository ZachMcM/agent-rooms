import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@agent-rooms/ui-library/components/sidebar'
import { TooltipProvider } from '@agent-rooms/ui-library/components/tooltip'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, createRootRoute, useMatch } from '@tanstack/react-router'

import { roomDetailQueryOptions } from '../queries'
import { RoomSidebar } from '../room-sidebar'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <RoomSidebar />
        <SidebarInset className="bg-background text-foreground font-sans antialiased">
          <header className="flex h-12 shrink-0 items-center border-b px-3">
            <SidebarTrigger aria-label="Toggle rooms navigation" />
            <HeaderTitle />
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function HeaderTitle() {
  const match = useMatch({ from: '/rooms/$roomId', shouldThrow: false })

  if (!match) {
    return <span className="ml-2 text-sm font-medium md:hidden">Agent Rooms</span>
  }

  return <RoomName roomId={match.params.roomId} />
}

function RoomName({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient()
  const room = useQuery(roomDetailQueryOptions(queryClient, roomId))

  if (!room.data) {
    return null
  }

  return (
    <span className="ml-2 min-w-0 flex-1 truncate font-semibold">{room.data.room.name}</span>
  )
}
