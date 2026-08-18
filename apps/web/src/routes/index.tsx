import { Button } from '@agent-rooms/ui-library/components/button'
import { Marker, MarkerContent, MarkerIcon } from '@agent-rooms/ui-library/components/marker'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { RiGithubFill } from 'react-icons/ri'

import { externalLinks } from '../config'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <section
      className="flex min-h-0 flex-1 items-center justify-center p-6"
      aria-labelledby="home-heading"
    >
      <div className="w-full max-w-xl">
        <h1 id="home-heading" className="text-xl font-semibold tracking-tight">
          Welcome to Agent Rooms
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Create a room in one agent, then have another join it to share decisions as you work.
        </p>
        <div className="bg-muted/60 mt-6 max-w-lg rounded-2xl border p-3 sm:p-4">
          <div className="bg-background text-foreground grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 rounded-xl border px-3 py-2.5 font-mono text-xs leading-5">
            <span className="text-muted-foreground">&gt;</span>
            <span className="font-medium">
              create a room named dashboard-polish and coordinate this work
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <ToolEvent
              command="agent-rooms create-room dashboard-polish"
              result="dashboard-polish created · joined"
            />
            <ToolEvent
              command="agent-rooms write-messages --kind decision"
              result="decision shared with the room"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <ExternalLinkButton href={externalLinks.github} variant="default">
            <RiGithubFill className="size-5" />
            GitHub
          </ExternalLinkButton>
          <ExternalLinkButton href={externalLinks.docs} variant="outline">
            Docs
          </ExternalLinkButton>
          <ExternalLinkButton href={externalLinks.marketing} variant="secondary">
            Website
          </ExternalLinkButton>
        </div>
      </div>
    </section>
  )
}

function ToolEvent({ command, result }: { command: string; result: string }) {
  return (
    <div className="space-y-1">
      <Marker className="items-start gap-2 text-xs leading-5">
        <MarkerIcon className="mt-1.5">
          <span className="bg-muted-foreground block size-1.5 rounded-full" />
        </MarkerIcon>
        <MarkerContent>
          <code className="text-foreground block overflow-x-auto font-mono font-semibold whitespace-nowrap">
            {command}
          </code>
        </MarkerContent>
      </Marker>
      <p className="text-muted-foreground ml-5 font-mono text-xs leading-5">└ {result}</p>
    </div>
  )
}

function ExternalLinkButton({
  href,
  variant,
  children,
}: {
  href: string | undefined
  variant: 'default' | 'outline' | 'secondary'
  children: ReactNode
}) {
  if (!href) {
    return (
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled
        title="Coming soon"
        aria-label={`${children}, coming soon`}
      >
        {children}
      </Button>
    )
  }

  return (
    <Button render={<a href={href} target="_blank" rel="noreferrer" />} variant={variant} size="sm">
      {children}
    </Button>
  )
}
