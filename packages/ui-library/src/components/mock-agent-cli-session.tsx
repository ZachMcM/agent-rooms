import { cn } from '@agent-rooms/ui-library/lib/utils'

type MockAgentCliSessionEntry = {
  command?: string
  output?: string | string[]
}

type MockAgentCliSessionData = {
  agent: string
  worktree: string
  room: string
  prompt: string
  entries: MockAgentCliSessionEntry[]
}

function MockAgentCliSession({
  data,
  className,
  ...props
}: React.ComponentProps<'section'> & { data: MockAgentCliSessionData }) {
  return (
    <section
      data-slot="mock-agent-cli-session"
      aria-label={`${data.agent} session in ${data.room}`}
      className={cn(
        'w-full max-w-2xl overflow-hidden rounded-xl border bg-secondary/45 text-sm text-muted-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <header className="bg-muted/40 flex min-w-0 items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="bg-muted-foreground/35 size-2.5 rounded-full" />
          <span className="bg-muted-foreground/25 size-2.5 rounded-full" />
          <span className="bg-muted-foreground/15 size-2.5 rounded-full" />
        </span>
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-center text-xs font-medium sm:text-sm">
          {data.agent} <span aria-hidden="true">·</span> {data.worktree}
        </span>
        <span className="text-muted-foreground max-w-28 truncate text-xs sm:max-w-40 sm:text-sm">
          {data.room}
        </span>
      </header>
      <div className="space-y-5 p-4 font-mono text-xs leading-5 sm:p-5 sm:text-sm sm:leading-6">
        <p className="text-foreground/80">
          <span aria-hidden="true">› </span>
          {data.prompt}
        </p>
        <ol className="space-y-5">
          {data.entries.map((entry, index) => (
            <li key={`${entry.command ?? 'output'}-${index}`} className="space-y-1.5">
              {entry.command ? (
                <p className="text-foreground/80">
                  <span aria-hidden="true">● </span>
                  {entry.command}
                </p>
              ) : null}
              {entry.output ? (
                <div className="text-muted-foreground pl-4 whitespace-pre-wrap sm:pl-7">
                  {(typeof entry.output === 'string' ? [entry.output] : entry.output).map(
                    (line, lineIndex) => (
                      <p key={`${line}-${lineIndex}`}>{line}</p>
                    ),
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export { MockAgentCliSession, type MockAgentCliSessionData, type MockAgentCliSessionEntry }
