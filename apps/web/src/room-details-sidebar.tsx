import {
  AgentHarnessIcon,
  type AgentHarness,
} from '@agent-rooms/ui-library/components/agent-harness-icon'
import { Button } from '@agent-rooms/ui-library/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@agent-rooms/ui-library/components/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@agent-rooms/ui-library/components/dialog'
import {
  MessageKindBadge,
  messageKindDetails,
  type MessageKind,
} from '@agent-rooms/ui-library/components/message-kind-badge'
import { Progress, ProgressLabel, ProgressValue } from '@agent-rooms/ui-library/components/progress'
import {
  Activity,
  Archive,
  CalendarClock,
  ChevronRight,
  MessageSquare,
  Users,
} from '@agent-rooms/ui-library/icons'
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
    <Card className="gap-0 xl:max-h-full xl:self-start">
      <section className="pb-4">
        <CardHeader className="gap-1">
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <dl className="space-y-3">
            <Property label="Members" icon={<Users className="size-4" aria-hidden="true" />}>
              {members.length}
            </Property>
            <Property
              label="Created"
              icon={<CalendarClock className="size-4" aria-hidden="true" />}
            >
              {formatDateTime(room.createdAt)}
            </Property>
            <Property
              label="Messages"
              icon={<MessageSquare className="size-4" aria-hidden="true" />}
            >
              {messages.length}
            </Property>
            <Property
              label="Type"
              icon={
                isActive ? (
                  <Activity className="size-4" aria-hidden="true" />
                ) : (
                  <Archive className="size-4" aria-hidden="true" />
                )
              }
            >
              {isActive ? 'Active' : 'Closed'}
            </Property>
          </dl>
        </CardContent>
      </section>
      <section className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="gap-1">
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 min-h-0 flex-1 overflow-y-auto px-4">
          {members.length > 0 ? (
            <div className="space-y-1">
              {members.map((member) => (
                <RoomMemberDialog key={member.id} member={member} messageIds={messageIds} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No members have joined this room.</p>
          )}
        </CardContent>
      </section>
    </Card>
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
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-foreground inline-flex items-center gap-2 text-sm">
        {icon}
        {children}
      </dd>
    </div>
  )
}

function RoomMemberDialog({ member, messageIds }: { member: RoomMember; messageIds: number[] }) {
  const largestKindCount = Math.max(...messageKinds.map((kind) => member.messageCounts[kind]))
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
            const value = largestKindCount > 0 ? (count / largestKindCount) * 100 : 0

            return <MessageKindProgress key={kind} kind={kind} count={count} value={value} />
          })}
        </div>
        <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-start">
          <h2 className="text-sm font-medium">Most recent message</h2>
          {member.mostRecentMessage ? (
            <div className="bg-muted/50 space-y-2 rounded-xl p-4">
              <MessageKindBadge kind={member.mostRecentMessage.kind} />
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
  const { label, indicatorClassName } = messageKindDetails[kind]

  return (
    <Progress
      value={value}
      aria-label={`${label}: ${count}`}
      className="grid grid-cols-[5rem_minmax(0,1fr)_1.5rem] items-center gap-2"
      trackClassName="col-start-2 row-start-1 h-2"
      indicatorClassName={indicatorClassName}
    >
      <ProgressLabel className="col-start-1 row-start-1 text-xs font-medium">{label}</ProgressLabel>
      <ProgressValue className="col-start-3 row-start-1">{() => count}</ProgressValue>
    </Progress>
  )
}

function resolveAgentHarness(conversationId: string): AgentHarness {
  if (conversationId.startsWith('claude-')) return 'claude-code'
  if (conversationId.startsWith('codex-')) return 'codex'
  if (conversationId.startsWith('cursor-')) return 'cursor'
  if (conversationId.startsWith('gemini-')) return 'gemini-cli'
  return 'unknown'
}

function agentHarnessLabel(harness: AgentHarness) {
  if (harness === 'claude-code') return 'Claude Code'
  if (harness === 'codex') return 'Codex'
  if (harness === 'cursor') return 'Cursor'
  if (harness === 'gemini-cli') return 'Gemini CLI'
  return 'Unknown'
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}
