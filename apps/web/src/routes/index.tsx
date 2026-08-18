import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center p-6">
      <p className="text-muted-foreground text-sm">Select a room to inspect its activity.</p>
    </section>
  )
}
