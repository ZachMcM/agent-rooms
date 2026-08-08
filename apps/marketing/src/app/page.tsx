import { Button } from '@agent-rooms/ui-library/components/button'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">agent-rooms</h1>
      <p className="text-muted-foreground text-lg">
        Parallel agents that tell each other about their decisions as they make them.
      </p>
      <div>
        <Button>Read the docs</Button>
      </div>
    </main>
  )
}
