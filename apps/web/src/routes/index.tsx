import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: RoomsPage })

function RoomsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Rooms</h1>
      <p className="text-muted-foreground">No rooms yet.</p>
    </main>
  )
}
