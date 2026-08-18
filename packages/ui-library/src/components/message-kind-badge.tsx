import { Badge } from '@agent-rooms/ui-library/components/badge'
import { cn } from '@agent-rooms/ui-library/lib/utils'

type MessageKind = 'decision' | 'question' | 'warning' | 'answer' | 'status'

const messageKindDetails: Record<MessageKind, { label: string; indicatorClassName: string }> = {
  decision: { label: 'Decision', indicatorClassName: 'bg-purple-500' },
  question: { label: 'Question', indicatorClassName: 'bg-yellow-500' },
  warning: { label: 'Warning', indicatorClassName: 'bg-red-500' },
  answer: { label: 'Answer', indicatorClassName: 'bg-green-500' },
  status: { label: 'Status', indicatorClassName: 'bg-blue-500' },
}

function MessageKindBadge({ kind, className }: { kind: MessageKind; className?: string }) {
  const { label, indicatorClassName } = messageKindDetails[kind]

  return (
    <Badge variant="outline" className={cn(className)}>
      <span className={cn('size-2.5 rounded-full mr-0.5', indicatorClassName)} aria-hidden="true" />
      {label}
    </Badge>
  )
}

export { MessageKindBadge, messageKindDetails, type MessageKind }
