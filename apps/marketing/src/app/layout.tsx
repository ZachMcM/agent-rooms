import '@agent-rooms/ui-library/globals.css'
import type { Metadata } from 'next'

import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'agent-rooms',
  description: 'Real-time decision sharing between parallel coding agents.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
