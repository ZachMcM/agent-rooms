import './globals.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { VercelAnalytics } from '@/components/vercel-analytics'
import { siteDescription, siteName, siteTagline, siteUrl, socialImageAlt } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: { canonical: '/' },
  keywords: [
    'AI coding agents',
    'multi-agent coordination',
    'Claude Code',
    'Codex',
    'Cursor',
    'OpenCode',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: socialImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [{ url: '/twitter-image', alt: socialImageAlt }],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
        <VercelAnalytics />
      </body>
    </html>
  )
}
