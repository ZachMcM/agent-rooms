import { Outlet, createRootRoute } from '@tanstack/react-router'

import { AuthProvider } from '../lib/auth-context'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <AuthProvider>
      <div className="bg-background text-foreground min-h-dvh font-sans antialiased">
        <Outlet />
      </div>
    </AuthProvider>
  )
}
