import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="bg-background text-foreground min-h-dvh font-sans antialiased">
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  )
}
