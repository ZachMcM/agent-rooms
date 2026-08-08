import type { Principal, RuntimeConfig } from '@agent-rooms/protocol'
import { type ReactNode, createContext, use, useEffect, useMemo, useState } from 'react'

import { authClient } from './auth-client'
import { fetchRuntimeConfig } from './runtime-config'

// The auth context always exists. Locally its provider resolves immediately to the fixed
// principal and route guards always pass, so the login route is simply never reached.
export type AuthState = {
  status: 'loading' | 'authenticated' | 'anonymous'
  principal: Principal | null
}

const LOADING: AuthState = { status: 'loading', principal: null }
const ANONYMOUS: AuthState = { status: 'anonymous', principal: null }

export const AuthContext = createContext<AuthState>(LOADING)

export function useAuth(): AuthState {
  return use(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const next = await fetchRuntimeConfig()
        if (!cancelled) setConfig(next)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  // TODO: surface the boot failure instead of degrading to anonymous. In cloud that lands on the
  // login page, which is close enough to right; locally there is no login page to land on.
  if (failed) return <AuthContext value={ANONYMOUS}>{children}</AuthContext>
  if (!config) return <AuthContext value={LOADING}>{children}</AuthContext>

  // Mode is read once, here, and never again — the same rule the api follows. Only cloud mounts
  // the session hook at all: locally there is no auth handler behind it to call.
  return config.mode === 'cloud' ? (
    <CloudAuthProvider>{children}</CloudAuthProvider>
  ) : (
    <LocalAuthProvider principal={config.principal}>{children}</LocalAuthProvider>
  )
}

function CloudAuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession()

  const state = useMemo<AuthState>(() => {
    if (isPending) return LOADING
    // Only the id crosses into app state, mirroring what the api puts on the principal. Anything
    // else a screen needs about the user is a fetch, not a widened principal.
    return data ? { status: 'authenticated', principal: { userId: data.user.id } } : ANONYMOUS
  }, [data, isPending])

  return <AuthContext value={state}>{children}</AuthContext>
}

function LocalAuthProvider({
  principal,
  children,
}: {
  principal: Principal | null
  children: ReactNode
}) {
  const state = useMemo<AuthState>(
    () => (principal ? { status: 'authenticated', principal } : ANONYMOUS),
    [principal],
  )

  return <AuthContext value={state}>{children}</AuthContext>
}
