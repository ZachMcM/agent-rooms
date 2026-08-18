import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@agent-rooms/ui-library/components/sidebar'
import { TooltipProvider } from '@agent-rooms/ui-library/components/tooltip'
import { Outlet, createRootRoute } from '@tanstack/react-router'

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
            <span className="ml-2 text-sm font-medium md:hidden">Agent Rooms</span>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
