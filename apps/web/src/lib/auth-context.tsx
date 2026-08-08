import type { Principal } from '@agent-comms/protocol'
import { createContext, use } from 'react'

// The auth context always exists. Locally its provider resolves immediately to the fixed
// principal and route guards always pass, so the login route is simply never reached.
export type AuthState = {
  status: 'loading' | 'authenticated' | 'anonymous'
  principal: Principal | null
}

export const AuthContext = createContext<AuthState>({ status: 'loading', principal: null })

export function useAuth(): AuthState {
  return use(AuthContext)
}
