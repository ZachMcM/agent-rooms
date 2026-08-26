import {
  AgentHarnessIcon,
  type AgentHarness,
} from '@coordrooms/ui-library/components/agent-harness-icon'
import { Button } from '@coordrooms/ui-library/components/button'
import { Card, CardContent } from '@coordrooms/ui-library/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@coordrooms/ui-library/components/collapsible'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@coordrooms/ui-library/components/dialog'
import {
  MessageKindPill,
  messageKindDetails,
  type MessageKind,
} from '@coordrooms/ui-library/components/message-kind-pill'
import { Progress, ProgressLabel, ProgressValue } from '@coordrooms/ui-library/components/progress'
import { Skeleton } from '@coordrooms/ui-library/components/skeleton'
import { Activity, Archive, ChevronRight, Clock, Send, Users } from '@coordrooms/ui-library/icons'
import type { ReactNode } from 'react'

import type { Room, RoomMember, RoomMessage } from './api'
import { isRoomActive } from './sidebar-domain'

const messageKinds = ['decision', 'warning', 'question', 'answer', 'status'] as const

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function RoomDetailsSidebar({
  room,
  messages,
  members,
}: {
  room: Room
  messages: RoomMessage[]
  members: RoomMember[]
}) {
  const messageIds = messages.map((message) => message.id)
  const isActive = isRoomActive({ members })

  return (
    <div className="flex min-h-0 flex-col gap-3 xl:max-h-full xl:self-start xl:overflow-y-auto xl:px-px xl:py-px">
      <Card className="gap-0 py-0">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:text-foreground w-full rounded-xl px-6 py-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset">
            <span className="inline-flex items-center text-sm">
              Properties
              <ChevronRight
                className="ml-2.5 size-3.5 transition-transform group-data-panel-open:rotate-90"
                aria-hidden="true"
              />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-2 pb-4">
              <dl className="space-y-4">
                <Property label="Members" icon={<Users className="size-3.5" aria-hidden="true" />}>
                  {members.length}
                </Property>
                <Property label="Created" icon={<Clock className="size-3.5" aria-hidden="true" />}>
                  {formatDateTime(room.createdAt)}
                </Property>
                <Property label="Messages" icon={<Send className="size-3.5" aria-hidden="true" />}>
                  {messages.length}
                </Property>
                <Property
                  label="Type"
                  icon={
                    isActive ? (
                      <Activity className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Archive className="size-3.5" aria-hidden="true" />
                    )
                  }
                >
                  {isActive ? 'Active' : 'Closed'}
                </Property>
              </dl>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card className="gap-0 py-0">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:text-foreground w-full rounded-xl px-6 py-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset">
            <span className="inline-flex items-center text-sm">
              Members
              <ChevronRight
                className="ml-2.5 size-3.5 transition-transform group-data-panel-open:rotate-90"
                aria-hidden="true"
              />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pt-2 pb-4">
              {members.length > 0 ? (
                <div>
                  {members.map((member) => (
                    <RoomMemberDialog key={member.id} member={member} messageIds={messageIds} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm">No members have joined this room.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}

export function RoomDetailsSidebarSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-col gap-3 xl:max-h-full xl:self-start xl:overflow-y-auto xl:px-px xl:py-px"
      role="status"
      aria-label="Loading room details"
      aria-busy="true"
    >
      <Card className="gap-0 py-0">
        <div className="px-6 py-3" aria-hidden="true">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-4 w-18" />
            <Skeleton className="size-3.5" />
          </div>
        </div>
        <CardContent className="pt-2 pb-4" aria-hidden="true">
          <dl className="space-y-4">
            {['members', 'created', 'messages', 'type'].map((property) => (
              <div key={property} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-14" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-3.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card className="gap-0 py-0">
        <div className="px-6 py-3" aria-hidden="true">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="size-3.5" />
          </div>
        </div>
        <CardContent className="px-4 pt-2 pb-4" aria-hidden="true">
          {['one', 'two', 'three'].map((member) => (
            <div key={member} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Skeleton className="size-8 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="size-4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Property({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground text-xs font-normal">{label}</dt>
      <dd className="text-foreground inline-flex items-center gap-2 text-xs font-medium">
        {icon}
        {children}
      </dd>
    </div>
  )
}

function RoomMemberDialog({ member, messageIds }: { member: RoomMember; messageIds: number[] }) {
  const messagesRead = messageIds.filter((messageId) => messageId <= member.cursor).length
  const harness = resolveAgentHarness(member.conversationId)

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-xl px-2 py-2 text-left"
          />
        }
      >
        <AgentHarnessIcon harness={harness} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{member.conversationId}</span>
          <span className="text-muted-foreground block text-xs">
            {member.messageCounts.total} {member.messageCounts.total === 1 ? 'message' : 'messages'}
          </span>
        </span>
        <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3">
          <AgentHarnessIcon harness={harness} />
          <DialogTitle className="min-w-0 flex-1 pr-8 break-all">
            {member.conversationId}
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Agent Harness</dt>
            <dd className="mt-1">{agentHarnessLabel(harness)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Joined</dt>
            <dd className="mt-1">{formatDateTime(member.joinedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Messages read</dt>
            <dd className="mt-1">
              {messagesRead} of {messageIds.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Messages written</dt>
            <dd className="mt-1">{member.messageCounts.total}</dd>
          </div>
        </dl>
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Messages by kind</h2>
          {messageKinds.map((kind) => {
            const count = member.messageCounts[kind]
            const value =
              member.messageCounts.total > 0 ? (count / member.messageCounts.total) * 100 : 0

            return <MessageKindProgress key={kind} kind={kind} count={count} value={value} />
          })}
        </div>
        <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-start">
          <h2 className="text-sm font-medium">Most recent message</h2>
          {member.mostRecentMessage ? (
            <div className="bg-muted/50 space-y-2 rounded-xl p-4">
              <MessageKindPill kind={member.mostRecentMessage.kind} />
              <p className="text-sm leading-6 whitespace-pre-wrap">
                {member.mostRecentMessage.body}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No messages from this member yet.</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MessageKindProgress({
  kind,
  count,
  value,
}: {
  kind: MessageKind
  count: number
  value: number
}) {
  const { label } = messageKindDetails[kind]

  return (
    <Progress
      value={value}
      aria-label={`${label}: ${count}`}
      className="grid grid-cols-[5rem_minmax(0,1fr)_1.5rem] items-center gap-2"
      trackClassName="col-start-2 row-start-1 h-2"
    >
      <ProgressLabel className="col-start-1 row-start-1 text-xs font-normal">{label}</ProgressLabel>
      <ProgressValue className="col-start-3 row-start-1">{() => count}</ProgressValue>
    </Progress>
  )
}

function resolveAgentHarness(conversationId: string): AgentHarness {
  if (conversationId.startsWith('claude-')) return 'claude-code'
  if (conversationId.startsWith('codex-')) return 'codex'
  if (conversationId.startsWith('cursor-')) return 'cursor'
  if (conversationId.startsWith('opencode-')) return 'opencode'
  return 'unknown'
}

function agentHarnessLabel(harness: AgentHarness) {
  if (harness === 'claude-code') return 'Claude Code'
  if (harness === 'codex') return 'Codex'
  if (harness === 'cursor') return 'Cursor'
  if (harness === 'opencode') return 'OpenCode'
  return 'Unknown'
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}
