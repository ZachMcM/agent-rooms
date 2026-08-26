import { Button } from '@coordrooms/ui-library/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@coordrooms/ui-library/components/empty'
import { Separator } from '@coordrooms/ui-library/components/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@coordrooms/ui-library/components/sidebar'
import { TooltipProvider } from '@coordrooms/ui-library/components/tooltip'
import { Search } from '@coordrooms/ui-library/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRoute, useMatch } from '@tanstack/react-router'

import { roomDetailQueryOptions } from '../queries'

import '../styles.css'
import { RoomSidebar } from '../room-sidebar'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <RoomSidebar />
        <SidebarInset className="bg-background text-foreground font-sans antialiased">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <SidebarTrigger aria-label="Toggle rooms navigation" />
            <Separator orientation="vertical" />
            <HeaderTitle />
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function NotFoundComponent() {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center p-6">
      <Empty className="max-w-sm flex-none border-0 p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>This page is unavailable or has moved.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/" />} size="sm">
            Back to home
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  )
}

function HeaderTitle() {
  const match = useMatch({ from: '/rooms/$roomId', shouldThrow: false })

  if (!match) {
    return <span className="ml-2 text-sm font-medium md:hidden">CoordRooms</span>
  }

  return <RoomName roomId={match.params.roomId} />
}

function RoomName({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient()
  const room = useQuery(roomDetailQueryOptions(queryClient, roomId))

  if (!room.data) {
    return null
  }

  return <span className="ml-2 min-w-0 flex-1 truncate font-semibold">{room.data.room.name}</span>
}
