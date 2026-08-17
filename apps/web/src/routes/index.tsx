import { RiMessage3Line } from '@agent-rooms/ui-library/icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <RiMessage3Line aria-hidden="true" className="text-muted-foreground size-5" />
        Agent Rooms
      </h1>
    </main>
  )
}
