import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { useAuth } from './auth-context'

// A component rather than a beforeLoad guard because the auth state lives in React context and
// the router is created before any of it resolves.
// TODO: once cloud is real, move this into the router context so a redirect happens before the
// protected route's loader runs rather than after its component mounts.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return children
}
