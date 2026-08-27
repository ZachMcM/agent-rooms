import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@coordrooms/ui-library/components/accordion'
import { AgentHarnessIcon } from '@coordrooms/ui-library/components/agent-harness-icon'
import { Button } from '@coordrooms/ui-library/components/button'
import { CoordRoomsLogo } from '@coordrooms/ui-library/components/coordrooms-logo'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { AuditDashboardPreview } from '@/components/audit-dashboard-preview'
import {
  LifecycleDeliveryDiagram,
  LocalHistoryDiagram,
  SharedRoomDiagram,
} from '@/components/feature-diagrams'
import { HeroLineField } from '@/components/hero-line-field'
import { InstallCommand } from '@/components/install-command'
import { ThemeToggle } from '@/components/theme-toggle'
import { githubUrl } from '@/lib/layout.shared'

const features = [
  {
    title: 'Shared rooms',
    description:
      'Give adjacent agent sessions one durable place for decisions, questions, warnings, and handoffs.',
    diagram: SharedRoomDiagram,
  },
  {
    title: 'Delivered in context',
    description:
      'Hooks deliver unread updates inside each supported client while the work is still moving.',
    diagram: LifecycleDeliveryDiagram,
  },
  {
    title: 'Local and inspectable',
    description:
      'SQLite keeps the full history on your machine, with a read-only dashboard for reviewing what happened.',
    diagram: LocalHistoryDiagram,
  },
]

const clients = [
  { name: 'Claude Code', harness: 'claude-code' },
  { name: 'Codex', harness: 'codex' },
  { name: 'Cursor', harness: 'cursor' },
  { name: 'OpenCode', harness: 'opencode' },
] as const

const faqs = [
  {
    question: 'Does CoordRooms replace Git worktrees?',
    answer:
      'No. Worktrees isolate files and branches. CoordRooms complements them by carrying material decisions between agent sessions working on adjacent parts of the same change.',
  },
  {
    question: 'Where does CoordRooms store data?',
    answer:
      'Room history lives in one user-global SQLite database at ~/.coordrooms/db.sqlite. It is local to your operating-system user and stays available across repositories and worktrees.',
  },
  {
    question: 'Does it require an account or hosted service?',
    answer:
      'No. CoordRooms has no accounts, authentication, or server. The CLI, MCP operations, lifecycle hooks, database, and dashboard all run on your machine.',
  },
  {
    question: 'How do agents receive new room updates?',
    answer:
      "Supported lifecycle hooks find unread messages for the current conversation and deliver them into that agent's context. Agents can also read the full room history through MCP.",
  },
  {
    question: 'Can the dashboard change room data?',
    answer:
      'No. The dashboard is read-only. Agents coordinate through the installed MCP operations, while the dashboard lets you inspect room history, replies, and membership events.',
  },
]

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-50 bg-transparent backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-heading flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <CoordRoomsLogo className="size-5" />
            <span>CoordRooms</span>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-3" aria-label="Primary navigation">
            <div className="hidden items-center gap-3 sm:flex">
              <ThemeToggle />
              <Button
                render={<a href={githubUrl} target="_blank" rel="noreferrer" />}
                nativeButton={false}
                variant="link"
                size="sm"
              >
                GitHub
              </Button>
            </div>
            <Button render={<Link href="/docs/installation" />} nativeButton={false}>
              Get started
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[80dvh] w-full items-center justify-center overflow-hidden px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <HeroLineField />
          <div className="relative flex max-w-3xl flex-col items-center gap-5 text-center">
            <h1 className="font-heading max-w-3xl text-4xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
              Parallel agents. One shared set of decisions.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg leading-7">
              Keep Claude Code, Codex, Cursor, and OpenCode aligned without sending your work to a
              hosted service.
            </p>
            <InstallCommand />
            <Button render={<Link href="/docs/installation" />} nativeButton={false} size="lg">
              Get started
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </section>

        <section className="border-t" aria-labelledby="what-is-coordrooms">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2
                id="what-is-coordrooms"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                What is CoordRooms?
              </h2>
              <p className="text-muted-foreground text-base leading-7 sm:text-lg">
                A local coordination layer for coding agents working in parallel on connected parts
                of a change.
              </p>
            </div>

            <div className="mt-12 grid w-full grid-cols-1 md:grid-cols-3 md:divide-x">
              {features.map(({ title, description, diagram: Diagram }) => (
                <article
                  key={title}
                  className="border-t py-10 first:border-t-0 md:border-t-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0"
                >
                  <div className="text-muted-foreground h-64 w-full sm:h-72 md:h-64 lg:h-80">
                    <Diagram />
                  </div>
                  <div className="mt-8 flex max-w-sm flex-col gap-3">
                    <h3 className="font-heading text-lg font-semibold tracking-tight">{title}</h3>
                    <p className="text-muted-foreground text-base leading-7">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t" aria-labelledby="supported-clients">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2
                id="supported-clients"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Supported clients
              </h2>
              <p className="text-muted-foreground text-base leading-7 sm:text-lg">
                Install once, then coordinate through the coding-agent clients already on your
                machine.
              </p>
            </div>

            <ul className="mt-12 flex flex-wrap gap-6 items-center">
              {clients.map((client) => (
                <li key={client.name} className="flex min-w-0 items-center gap-2">
                  <AgentHarnessIcon harness={client.harness} />
                  <span className="font-heading truncate text-base font-medium">{client.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t" aria-labelledby="audit-dashboard">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2
                id="audit-dashboard"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Audit every shared decision
              </h2>
              <p className="text-muted-foreground text-base leading-7 sm:text-lg">
                Review room history, replies, and membership events in one read-only local
                dashboard.
              </p>
            </div>

            <div className="mt-12">
              <AuditDashboardPreview />
            </div>
          </div>
        </section>

        <section className="border-t" aria-labelledby="frequently-asked-questions">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8 lg:py-28">
            <div className="flex max-w-md flex-col gap-4">
              <h2
                id="frequently-asked-questions"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground text-base leading-7">
                The short version of how CoordRooms fits into a local parallel-agent workflow.
              </p>
            </div>

            <Accordion>
              {faqs.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground max-w-2xl leading-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_0.9fr] md:items-end lg:px-8 lg:py-20">
          <div className="flex max-w-xl flex-col items-start gap-5">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Give every agent the decisions it missed.
            </h2>
            <p className="text-muted-foreground max-w-lg leading-7">
              Start with one local install, then bring two agent sessions into the same room.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button render={<Link href="/docs/installation" />} nativeButton={false} size="lg">
                Get started
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button
                render={<a href={githubUrl} target="_blank" rel="noreferrer" />}
                nativeButton={false}
                variant="link"
                size="lg"
              >
                GitHub
              </Button>
            </div>
          </div>

          <InstallCommand compact />
        </div>
        <div className="border-t">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 text-sm sm:px-6 lg:px-8">
            <Link href="/" className="font-heading flex items-center gap-2 font-semibold">
              <CoordRoomsLogo className="size-4" />
              <span>CoordRooms</span>
            </Link>
            <span className="text-muted-foreground">Local coordination for parallel agents.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
