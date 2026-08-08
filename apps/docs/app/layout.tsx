import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import type { ReactNode } from 'react'

import 'nextra-theme-docs/style.css'

export const metadata: Metadata = {
  title: {
    default: 'agent-comms',
    template: '%s — agent-comms',
  },
  description: 'Pseudo-real-time decision sharing between parallel coding agents.',
}

const navbar = <Navbar logo={<b>agent-comms</b>} />
const footer = <Footer>MIT {new Date().getFullYear()} © agent-comms.</Footer>

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/zachmcmullen/agent-comms/tree/main/apps/docs"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
