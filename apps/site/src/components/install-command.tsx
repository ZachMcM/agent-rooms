'use client'

import { Button } from '@coordrooms/ui-library/components/button'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

const installCommand = 'npx coordrooms@latest install'

export function InstallCommand({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [copied])

  async function copyCommand() {
    await navigator.clipboard.writeText(installCommand)
    setCopied(true)
  }

  return (
    <div
      className={
        compact
          ? 'bg-muted/40 relative flex min-w-0 items-center rounded-xl border px-10 py-2'
          : 'bg-muted/40 relative flex w-full max-w-lg items-center rounded-xl border px-10 py-2.5'
      }
      aria-label={`Install with ${installCommand}`}
    >
      <span className="text-muted-foreground absolute left-3 font-mono text-xs" aria-hidden="true">
        $
      </span>
      <code className="block w-full min-w-0 truncate text-left font-mono text-sm">
        {installCommand}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute right-2"
        aria-label={copied ? 'Copied install command' : 'Copy install command'}
        onClick={copyCommand}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Install command copied' : ''}
      </span>
    </div>
  )
}
