import {
  CircleCheck,
  CircleHelp,
  HeartPulse,
  Lightbulb,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from './badge'

type MessageKind = 'decision' | 'question' | 'warning' | 'answer' | 'status'

const messageKindDetails: Record<MessageKind, { label: string; icon: LucideIcon }> = {
  decision: {
    label: 'Decision',
    icon: Lightbulb,
  },
  question: {
    label: 'Question',
    icon: CircleHelp,
  },
  warning: {
    label: 'Warning',
    icon: TriangleAlert,
  },
  answer: {
    label: 'Answer',
    icon: CircleCheck,
  },
  status: {
    label: 'Status',
    icon: HeartPulse,
  },
}

function MessageKindPill({ kind, className }: { kind: MessageKind; className?: string }) {
  const { label, icon: Icon } = messageKindDetails[kind]

  return (
    <Badge className={className}>
      <Icon />
      {label}
    </Badge>
  )
}

export { MessageKindPill, messageKindDetails, type MessageKind }
