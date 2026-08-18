import { cn } from '@agent-rooms/ui-library/lib/utils'
import { MessageSquare } from 'lucide-react'
import { PiOpenAiLogo } from 'react-icons/pi'
import { SiClaude, SiCursor, SiGooglegemini } from 'react-icons/si'

type AgentHarness = 'claude-code' | 'codex' | 'cursor' | 'gemini-cli' | 'unknown'

function AgentHarnessIcon({ harness, className }: { harness: AgentHarness; className?: string }) {
  const iconClassName = 'size-4'
  const containerClassName = cn(
    'flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary ring-1 ring-primary/20',
    className,
  )

  if (harness === 'claude-code') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <SiClaude className={iconClassName} />
      </span>
    )
  }

  if (harness === 'codex') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <PiOpenAiLogo className={iconClassName} />
      </span>
    )
  }

  if (harness === 'cursor') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <SiCursor className={iconClassName} />
      </span>
    )
  }

  if (harness === 'gemini-cli') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <SiGooglegemini className={iconClassName} />
      </span>
    )
  }

  return (
    <span className={containerClassName} aria-hidden="true">
      <MessageSquare className={iconClassName} />
    </span>
  )
}

export { AgentHarnessIcon, type AgentHarness }
