import { AgentHarnessIcon } from '@agent-rooms/ui-library/components/agent-harness-icon'
import { Marker, MarkerContent, MarkerIcon } from '@agent-rooms/ui-library/components/marker'
import { CheckCircle2, FileSearch, LoaderCircle } from 'lucide-react'

export function AgentDesktopSessionMock() {
  return (
    <section
      aria-label="Codex agent session receiving Agent Rooms context"
      className="bg-secondary/25 w-full max-w-2xl overflow-hidden rounded-xl border shadow-sm"
    >
      <header className="bg-muted/30 flex min-w-0 items-center gap-3 border-b px-4 py-3 sm:px-5">
        <AgentHarnessIcon harness="codex" className="size-8 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Codex</p>
          <p className="text-muted-foreground truncate font-mono text-xs">feature/rooms</p>
        </div>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">agent-rooms</span>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="bg-background/60 rounded-lg border p-4">
          <p className="text-muted-foreground font-mono text-xs">You</p>
          <p className="mt-2 text-sm leading-6">
            Map the CLI commands around the shared database contract.
          </p>
        </div>

        <div className="bg-background/60 rounded-lg border p-4">
          <div className="flex min-w-0 items-center gap-2">
            <AgentHarnessIcon harness="unknown" className="size-6 rounded-md" />
            <p className="min-w-0 text-sm font-medium">Agent Rooms</p>
          </div>
          <p className="text-muted-foreground mt-3 font-mono text-xs">New room context</p>
          <div className="mt-2 space-y-2 border-l pl-3 text-sm leading-6">
            <p className="min-w-0 break-words">
              Decision: Start with the shared database contract.
            </p>
            <p className="min-w-0 break-words">Question: Should I map the CLI commands next?</p>
          </div>
        </div>

        <Marker variant="separator" className="py-1 font-mono text-xs">
          <MarkerIcon>
            <LoaderCircle className="animate-spin motion-reduce:animate-none" />
          </MarkerIcon>
          <MarkerContent>Codex is checking the room context</MarkerContent>
        </Marker>

        <div className="grid grid-cols-1 gap-3 border-t pt-4 md:grid-cols-2">
          <div className="flex min-w-0 items-start gap-2 text-sm">
            <FileSearch className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">Reading the room history</span>
          </div>
          <div className="flex min-w-0 items-start gap-2 text-sm">
            <CheckCircle2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">Working from the recorded decision</span>
          </div>
        </div>
      </div>
    </section>
  )
}
