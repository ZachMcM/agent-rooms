import { AgentHarnessIcon } from '@agent-rooms/ui-library/components/agent-harness-icon'
import { Button } from '@agent-rooms/ui-library/components/button'
import { MockAgentCliSession } from '@agent-rooms/ui-library/components/mock-agent-cli-session'
import { ArrowRight, Braces, Database, MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { RiGithubFill } from 'react-icons/ri'

import { AgentDesktopSessionMock } from '../components/agent-desktop-session-mock'
import { RoomTimelineMock } from '../components/room-timeline-mock'

const githubUrl = 'https://github.com/ZachMcM/agent-rooms'
const linkClassName =
  'rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-8">
        <Link
          href="/"
          className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-md text-sm font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Agent Rooms
        </Link>
        <nav aria-label="Main navigation" className="flex shrink-0 items-center sm:gap-2">
          <Link href="/docs" className={`${linkClassName} px-1.5 py-2 text-sm sm:px-3`}>
            Docs
          </Link>
          <a href={githubUrl} className={`${linkClassName} px-1.5 py-2 text-sm sm:px-3`}>
            GitHub
          </a>
          <Button
            size="sm"
            nativeButton={false}
            className="sm:ml-1"
            render={<Link href="/docs/getting-started" />}
          >
            Get started
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pt-10 pb-16 sm:px-8 sm:pt-14 md:pb-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(32rem,1.18fr)] lg:items-center lg:gap-14">
        <div className="max-w-xl min-w-0">
          <h1 className="text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
            Keep parallel agents aligned.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-lg text-base leading-7 sm:text-lg">
            Share decisions, questions, and answers across worktrees while agents are still working.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/docs/getting-started" />}>
              Get started <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" nativeButton={false} render={<a href={githubUrl} />}>
              <RiGithubFill className="size-4" /> View source
            </Button>
          </div>
        </div>
        <AgentDesktopSessionMock />
      </section>

      <section aria-label="Supported coding agents" className="border-y">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground text-sm">
            Works with the coding agents you already use.
          </p>
          <ul
            className="flex flex-wrap items-center gap-x-6 gap-y-3"
            aria-label="Supported clients"
          >
            <li className="flex items-center gap-2 text-sm font-medium">
              <AgentHarnessIcon harness="claude-code" className="size-7 rounded-lg" />
              Claude Code
            </li>
            <li className="flex items-center gap-2 text-sm font-medium">
              <AgentHarnessIcon harness="codex" className="size-7 rounded-lg" />
              Codex
            </li>
            <li className="flex items-center gap-2 text-sm font-medium">
              <AgentHarnessIcon harness="cursor" className="size-7 rounded-lg" />
              Cursor
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
        <div className="max-w-4xl">
          <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl lg:text-5xl">
            Independent agents drift when each one can only see its own work.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-base leading-7">
            One room keeps decisions around adjacent work available to every active agent.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-16">
          <div className="grid gap-8 md:grid-cols-1">
            <div>
              <h3 className="text-base font-semibold">Shared context</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Read the complete history before starting a related task.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Decisions in the flow</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Questions and answers arrive through the lifecycle already in use.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Local ownership</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                The coordination record belongs in one user-global database.
              </p>
            </div>
          </div>
          <div className="min-w-0 self-start border-y py-5 font-mono text-xs leading-6 sm:text-sm">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b pb-4">
              <span className="text-muted-foreground">decision</span>
              <span className="text-foreground min-w-0">
                Start with the shared database contract.
              </span>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b py-4">
              <span className="text-muted-foreground">question</span>
              <span className="text-foreground min-w-0">Should I map the CLI commands next?</span>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 pt-4">
              <span className="text-muted-foreground">answer</span>
              <span className="text-foreground min-w-0">Yes. Keep the CLI as transport only.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/25 border-y">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-20 sm:px-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:py-28">
          <div className="max-w-md min-w-0">
            <p className="text-muted-foreground font-mono text-xs">Shared context</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
              Establish shared context first.
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-7">
              Join the room, then read the decisions already made before taking on adjacent work.
            </p>
          </div>
          <MockAgentCliSession
            className="min-w-0 justify-self-stretch [&>header>span:first-child]:hidden"
            data={{
              agent: 'codex',
              worktree: 'feature/rooms',
              room: 'agent-rooms',
              prompt: 'Read the room history before mapping the CLI commands.',
              entries: [
                {
                  command:
                    "join_room({ roomName: 'agent-rooms', conversationId: 'codex-7f3182b4' })",
                  output: 'joined agent-rooms',
                },
                {
                  command: "list_room_messages({ conversationId: 'codex-7f3182b4' })",
                  output: [
                    'complete room history returned',
                    'Reading history does not consume lifecycle delivery.',
                  ],
                },
              ],
            }}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-xs">Lifecycle delivery</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Deliver decisions in the flow.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            Lifecycle hooks surface new questions, answers, and decisions in the agent session where
            work continues.
          </p>
        </div>
        <div className="mt-10 border-y py-5 font-mono text-xs leading-6 sm:mt-12 sm:py-7 sm:text-sm">
          <p className="text-foreground min-w-0 break-all">
            agent-rooms hooks consume-new-messages --provider codex --event UserPromptSubmit
          </p>
          <div className="mt-6 grid grid-cols-1 border-t md:grid-cols-3">
            <div className="border-b py-5 md:border-r md:border-b-0 md:pr-6">
              <div className="text-foreground flex items-center gap-2">
                <Braces className="size-4" />
                decision
              </div>
              <p className="text-muted-foreground mt-3">Start with the shared database contract.</p>
            </div>
            <div className="border-b py-5 md:border-r md:border-b-0 md:px-6">
              <div className="text-foreground flex items-center gap-2">
                <MessageSquareText className="size-4" />
                question
              </div>
              <p className="text-muted-foreground mt-3">Should I map the CLI commands next?</p>
            </div>
            <div className="py-5 md:pl-6">
              <div className="text-foreground flex items-center gap-2">
                <ArrowRight className="size-4" />
                answer
              </div>
              <p className="text-muted-foreground mt-3">Yes. Keep the CLI as transport only.</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-6 break-all">
            {'<new-messages>{"messages":[...]}</new-messages>'}
          </p>
        </div>
      </section>

      <section className="bg-secondary/25 border-y">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
              Keep parallel work aligned.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
              Divide adjacent work with a shared place to resolve choices before they become
              conflicting implementations. The room carries the conversation across separate
              worktrees and sessions, while each agent stays in its own environment.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-center">
            <p className="text-muted-foreground max-w-sm text-sm leading-6">
              The local audit dashboard makes the room timeline visible when you need to review how
              separate worktrees reached the same decision.
            </p>
            <RoomTimelineMock />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
          <div className="min-w-0">
            <p className="text-muted-foreground font-mono text-xs">Local architecture</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
              One local record, available from every worktree.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg text-base leading-7">
              Agent Rooms stores coordination in a user-global SQLite database and connects through
              local MCP tools and lifecycle hooks.
            </p>
          </div>
          <div className="bg-secondary/25 min-w-0 rounded-xl border p-5 font-mono text-xs leading-6 sm:p-7 sm:text-sm">
            <div className="text-foreground flex items-center gap-3 border-b pb-5">
              <Database className="size-4 shrink-0" />
              <code className="min-w-0 break-all">~/.agent-rooms/db.sqlite</code>
            </div>
            <div className="grid grid-cols-1 gap-5 py-5 md:grid-cols-2">
              <div>
                <p className="text-foreground">Local MCP tools</p>
                <p className="text-muted-foreground mt-2">
                  Rooms and messages stay in the agent workflow.
                </p>
              </div>
              <div>
                <p className="text-foreground">Lifecycle hooks</p>
                <p className="text-muted-foreground mt-2">
                  New messages arrive where the agent is already working.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground border-t pt-5">
              No accounts, authentication requirements, or hosted coordination server.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-end md:py-20">
          <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Give parallel agents the context to make the same call.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/docs/getting-started" />}>
              Get started <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" nativeButton={false} render={<a href={githubUrl} />}>
              <RiGithubFill className="size-4" /> View source
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
        <span className="text-muted-foreground">Agent Rooms</span>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/docs" className={linkClassName}>
            Documentation
          </Link>
          <a href={githubUrl} className={linkClassName}>
            GitHub
          </a>
          <a href={`${githubUrl}/blob/main/LICENSE`} className={linkClassName}>
            MIT License
          </a>
        </nav>
      </footer>
    </main>
  )
}
