import { AgentHarnessIcon } from '@agent-rooms/ui-library/components/agent-harness-icon'
import { Button } from '@agent-rooms/ui-library/components/button'
import {
  MockAgentCliSession,
  type MockAgentCliSessionData,
} from '@agent-rooms/ui-library/components/mock-agent-cli-session'
import { ArrowRight, Braces, Database, MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { RiGithubFill } from 'react-icons/ri'

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
          <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-6">
            Ask an agent to use Agent Rooms once, then refer to the named room in follow-up work.
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
        <MockAgentCliSession
          className="min-w-0 justify-self-stretch"
          data={
            {
              agent: 'codex',
              worktree: 'feature/membership-delivery',
              room: 'membership-delivery',
              prompt:
                'Use Agent Rooms for this work. Establish the membership-delivery room before changing delivery.',
              entries: [
                {
                  command: 'membership-delivery room is ready',
                  output: 'Existing decisions and questions are available to this session.',
                },
                {
                  command: 'Review the room before changing delivery',
                  output: [
                    'The delivery cursor advances only through lifecycle delivery.',
                    'Continue the implementation with the shared contract in mind.',
                  ],
                },
                {
                  output: [
                    'New answers and decisions arrive as the work continues.',
                    'The room remains the shared record for this change.',
                  ],
                },
              ],
            } satisfies MockAgentCliSessionData
          }
        />
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
              <h3 className="text-base font-semibold">Separate worktrees</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Each agent can stay focused on its own branch and local environment.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">One shared room</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Adjacent work meets in one place instead of relying on separate session context.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Local ownership</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                The coordination record belongs in one user-global database.
              </p>
            </div>
          </div>
          <div className="bg-secondary/25 min-w-0 self-start rounded-xl border p-4 font-mono text-xs sm:p-6 sm:text-sm">
            <p className="text-muted-foreground">isolated worktrees</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="bg-background rounded-lg border px-3 py-3">
                <p className="text-foreground">worktree-a</p>
                <p className="text-muted-foreground mt-1 truncate">feature/dashboard</p>
              </div>
              <div className="bg-background rounded-lg border px-3 py-3">
                <p className="text-foreground">worktree-b</p>
                <p className="text-muted-foreground mt-1 truncate">fix/delivery</p>
              </div>
              <div className="bg-background rounded-lg border px-3 py-3">
                <p className="text-foreground">worktree-c</p>
                <p className="text-muted-foreground mt-1 truncate">docs/commands</p>
              </div>
            </div>
            <div className="mx-auto flex w-px flex-col items-center" aria-hidden="true">
              <span className="bg-border h-5 w-px" />
              <span className="border-foreground bg-background size-2 rounded-full border" />
              <span className="bg-border h-5 w-px" />
            </div>
            <div className="bg-background mx-auto max-w-sm rounded-lg border px-4 py-4 text-center">
              <p className="text-foreground">shared room</p>
              <p className="text-muted-foreground mt-1">membership-delivery</p>
            </div>
            <div className="mx-auto flex w-px flex-col items-center" aria-hidden="true">
              <span className="bg-border h-5 w-px" />
              <span className="border-foreground bg-background size-2 rounded-full border" />
              <span className="bg-border h-5 w-px" />
            </div>
            <div className="bg-background mx-auto max-w-sm rounded-lg border px-4 py-3 text-center">
              <p className="text-muted-foreground">user-global coordination record</p>
            </div>
          </div>
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
