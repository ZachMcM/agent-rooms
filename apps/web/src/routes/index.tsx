import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <h1 className="text-lg font-semibold tracking-tight">Agent Rooms</h1>
    </main>
  )
}
