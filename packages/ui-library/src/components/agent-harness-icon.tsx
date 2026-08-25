import { cn } from '@agent-rooms/ui-library/lib/utils'
import { Astroid } from 'lucide-react'
import { PiOpenAiLogo } from 'react-icons/pi'
import { SiClaude, SiCursor, SiOpencode } from 'react-icons/si'

type AgentHarness = 'claude-code' | 'codex' | 'cursor' | 'opencode' | 'unknown'

function AgentHarnessIcon({ harness, className }: { harness: AgentHarness; className?: string }) {
  const iconClassName = 'size-4'
  const containerClassName = cn(
    'flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary ring-1 ring-primary/20',
    className,
  )

  if (harness === 'claude-code') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <SiClaude className={cn(iconClassName, 'size-5')} />
      </span>
    )
  }

  if (harness === 'codex') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <PiOpenAiLogo className={cn(iconClassName, 'size-5')} />
      </span>
    )
  }

  if (harness === 'cursor') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <SiCursor className={cn(iconClassName, 'size-5')} />
      </span>
    )
  }

  if (harness === 'opencode') {
    return (
      <span className={containerClassName} aria-hidden="true">
        <SiOpencode className={cn(iconClassName, 'size-5')} />
      </span>
    )
  }

  return (
    <span className={containerClassName} aria-hidden="true">
      <Astroid className={cn(iconClassName, 'size-5')} />
    </span>
  )
}

export { AgentHarnessIcon, type AgentHarness }
