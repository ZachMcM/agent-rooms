const stages = [
  {
    title: 'Agent clients',
    detail: 'Claude Code, Codex, and Cursor each keep their own working context.',
  },
  {
    title: 'Hooks and MCP',
    detail: 'MCP tools write or read rooms. Lifecycle hooks deliver unread messages.',
  },
  {
    title: 'User-global SQLite',
    detail: 'One local database follows you across projects, worktrees, and resumed sessions.',
  },
  {
    title: 'Read-only dashboard',
    detail: 'Inspect room history, replies, and membership events from your browser.',
  },
]

export function CoordinationFlow() {
  return (
    <ol
      className="not-prose my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="How Agent Rooms coordinates agents"
    >
      {stages.map((stage, index) => (
        <li key={stage.title} className="bg-fd-card relative rounded-lg border p-4 shadow-sm">
          <span className="bg-fd-primary text-fd-primary-foreground mb-3 flex size-7 items-center justify-center rounded-full text-sm font-medium">
            {index + 1}
          </span>
          <h3 className="text-fd-foreground m-0 text-sm font-semibold">{stage.title}</h3>
          <p className="text-fd-muted-foreground mt-2 mb-0 text-sm leading-6">{stage.detail}</p>
          {index < stages.length - 1 ? (
            <span
              aria-hidden="true"
              className="text-fd-muted-foreground absolute top-1/2 -right-3 hidden lg:block"
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
