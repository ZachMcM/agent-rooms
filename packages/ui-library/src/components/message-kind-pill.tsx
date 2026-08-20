import { cn } from '@agent-rooms/ui-library/lib/utils'
import {
  Activity,
  CircleCheck,
  CircleHelp,
  Lightbulb,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

type MessageKind = 'decision' | 'question' | 'warning' | 'answer' | 'status'

const messageKindDetails: Record<
  MessageKind,
  { label: string; indicatorClassName: string; textClassName: string; icon: LucideIcon }
> = {
  decision: {
    label: 'Decision',
    indicatorClassName: 'bg-purple-500',
    textClassName: 'text-purple-500',
    icon: Lightbulb,
  },
  question: {
    label: 'Question',
    indicatorClassName: 'bg-yellow-500',
    textClassName: 'text-yellow-500',
    icon: CircleHelp,
  },
  warning: {
    label: 'Warning',
    indicatorClassName: 'bg-red-500',
    textClassName: 'text-red-500',
    icon: TriangleAlert,
  },
  answer: {
    label: 'Answer',
    indicatorClassName: 'bg-green-500',
    textClassName: 'text-green-500',
    icon: CircleCheck,
  },
  status: {
    label: 'Status',
    indicatorClassName: 'bg-blue-500',
    textClassName: 'text-blue-500',
    icon: Activity,
  },
}

function MessageKindPill({ kind, className }: { kind: MessageKind; className?: string }) {
  const { label, textClassName, icon: Icon } = messageKindDetails[kind]

  return (
    <span className={cn('inline-flex h-5 items-center gap-1.5 text-xs font-medium', className)}>
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded-full bg-current/15',
          textClassName,
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
      </span>
      <span className={textClassName}>{label}</span>
    </span>
  )
}

export { MessageKindPill, messageKindDetails, type MessageKind }
