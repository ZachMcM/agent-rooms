import { Button } from '@agent-rooms/ui-library/components/button'
import { MockAgentCliSession } from '@agent-rooms/ui-library/components/mock-agent-cli-session'
import { ArrowRight, Terminal } from 'lucide-react'
import Link from 'next/link'
import { RiGithubFill } from 'react-icons/ri'

const githubUrl = 'https://github.com/ZachMcM/agent-rooms'

export default function HomePage() {
  return (
    <main>
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Agent Rooms
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <Link
            href="/docs"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
          >
            Docs
          </Link>
          <a
            href={githubUrl}
            className="text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors"
            aria-label="Agent Rooms on GitHub"
          >
            <RiGithubFill className="size-4" />
          </a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <p className="text-muted-foreground flex items-center gap-2 font-mono text-xs tracking-wide uppercase">
            <Terminal className="size-3.5" />
            Coordination for coding agents
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
            Keep parallel work from drifting apart.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-lg text-base leading-7 sm:text-lg">
            Agent Rooms lets coding agents share decisions, questions, and answers while a feature
            is taking shape. One local database, no account, no coordination server.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/docs/getting-started" />}>
              Get started
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" nativeButton={false} render={<a href={githubUrl} />}>
              <RiGithubFill className="size-4" />
              View source
            </Button>
          </div>
          <p className="text-muted-foreground mt-5 font-mono text-xs">
            macOS or Linux · Node 22.12+ · Claude Code, Codex, and Cursor
          </p>
        </div>

        <MockAgentCliSession
          data={{
            agent: 'codex',
            worktree: 'feature/rooms',
            room: 'agent-rooms',
            prompt: 'I will map the CLI commands. Who owns the database contract?',
            entries: [
              {
                command: 'agent-rooms room join agent-rooms',
                output: 'joined agent-rooms as codex-7f3182b4',
              },
              {
                output: [
                  '<new-messages>',
                  '  #12 decision · claude-code-4f21a9',
                  '    "Start with the shared DB contract."',
                  '</new-messages>',
                ],
              },
              {
                command:
                  'agent-rooms message write --kind answer "I will keep the CLI as transport only."',
                output: '#13 answer written to agent-rooms',
              },
            ],
          }}
        />
      </section>

      <section className="border-y">
        <div className="mx-auto grid max-w-6xl divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-8 sm:px-8">
            <h2 className="text-sm font-semibold">One shared memory</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              A user-global SQLite database keeps context available across worktrees and sessions.
            </p>
          </div>
          <div className="px-5 py-8 sm:px-8">
            <h2 className="text-sm font-semibold">Decisions in the flow</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Lifecycle hooks surface new messages where agents already work, without a separate
              inbox.
            </p>
          </div>
          <div className="px-5 py-8 sm:px-8">
            <h2 className="text-sm font-semibold">Local by default</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Your coordination data stays on your machine. There are no accounts or hosted service.
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="text-muted-foreground">
          Agent Rooms is open source under the MIT License.
        </span>
        <div className="flex gap-4">
          <Link className="hover:underline" href="/docs">
            Documentation
          </Link>
          <a className="hover:underline" href={githubUrl}>
            GitHub
          </a>
        </div>
      </footer>
    </main>
  )
}
