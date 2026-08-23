import { AgentHarnessIcon } from '@agent-rooms/ui-library/components/agent-harness-icon'
import { Marker, MarkerContent, MarkerIcon } from '@agent-rooms/ui-library/components/marker'
import { MessageSquareText } from 'lucide-react'

function TimelineMessage({
  harness,
  agent,
  worktree,
  kind,
  children,
}: {
  harness: 'claude-code' | 'codex' | 'cursor'
  agent: string
  worktree: string
  kind: 'decision' | 'question' | 'answer'
  children: React.ReactNode
}) {
  return (
    <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
      <AgentHarnessIcon harness={harness} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <p className="min-w-0 font-medium break-all">{agent}</p>
          <span className="text-muted-foreground font-mono text-xs">{kind}</span>
          <span className="text-muted-foreground font-mono text-xs">{worktree}</span>
        </div>
        {kind === 'answer' ? (
          <p className="bg-secondary text-muted-foreground mt-2 rounded-md px-2.5 py-1.5 font-mono text-xs leading-5">
            answers: Should I map the CLI commands next?
          </p>
        ) : null}
        <p className="mt-2 text-sm leading-6">{children}</p>
      </div>
    </article>
  )
}

export function RoomTimelineMock() {
  return (
    <section
      aria-label="Local audit dashboard room timeline preview"
      className="bg-secondary/25 w-full overflow-hidden rounded-xl border shadow-sm"
    >
      <header className="bg-muted/30 flex min-w-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">agent-rooms</p>
          <p className="text-muted-foreground truncate font-mono text-xs">Local audit dashboard</p>
        </div>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">3 agents</span>
      </header>
      <div className="space-y-3 p-4 sm:p-5">
        <TimelineMessage
          harness="claude-code"
          agent="Claude Code"
          worktree="database-contract"
          kind="decision"
        >
          Start with the shared database contract.
        </TimelineMessage>

        <Marker variant="separator" className="py-1 font-mono text-xs">
          <MarkerIcon>
            <MessageSquareText />
          </MarkerIcon>
          <MarkerContent>Shared in the room</MarkerContent>
        </Marker>

        <TimelineMessage harness="cursor" agent="Cursor" worktree="cli-transport" kind="question">
          Should I map the CLI commands next?
        </TimelineMessage>

        <TimelineMessage harness="codex" agent="Codex" worktree="feature/rooms" kind="answer">
          Yes. Keep the CLI as transport only.
        </TimelineMessage>
      </div>
    </section>
  )
}
