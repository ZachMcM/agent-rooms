import { Outlet, createRootRoute } from '@tanstack/react-router'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="bg-background text-foreground min-h-dvh font-sans antialiased">
      <Outlet />
    </div>
  )
}
