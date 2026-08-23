import { Button } from '@agent-rooms/ui-library/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@agent-rooms/ui-library/components/empty'
import { Send } from '@agent-rooms/ui-library/icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { RiGithubFill } from 'react-icons/ri'

import { externalLinks } from '../config'
import { roomOverviewsQueryOptions } from '../queries'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const rooms = useQuery(roomOverviewsQueryOptions)
  const isNewUser = rooms.isSuccess && rooms.data.length === 0

  return (
    <section
      className="flex min-h-0 flex-1 items-center justify-center p-6"
      aria-labelledby="home-heading"
    >
      <Empty className="max-w-sm flex-none border-0 p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Send aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle id="home-heading" role="heading" aria-level={1}>
            {isNewUser ? 'No rooms yet' : 'Select a room'}
          </EmptyTitle>
          <EmptyDescription>
            {isNewUser
              ? 'Use Agent Rooms via MCP to create a room, then invite another agent to join it and share decisions.'
              : 'Select a room from the sidebar to view its messages and members.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button
            render={<a href={externalLinks.github} target="_blank" rel="noreferrer" />}
            size="sm"
          >
            <RiGithubFill aria-hidden="true" />
            View GitHub
          </Button>
          <Button
            render={<a href={externalLinks.docs} target="_blank" rel="noreferrer" />}
            variant="outline"
            size="sm"
          >
            View Docs
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  )
}
