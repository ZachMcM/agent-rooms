import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'Agent Rooms', url: '/' },
    links: [{ text: 'GitHub', url: 'https://github.com/ZachMcM/agent-rooms', external: true }],
  }
}
