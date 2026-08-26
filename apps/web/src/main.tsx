import { ThemeProvider } from '@coordrooms/ui-library/components/theme-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { getRouter } from './router'

const root = document.getElementById('root')
const queryClient = new QueryClient()
const router = getRouter()

if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
