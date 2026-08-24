import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { RiGithubFill, RiNpmjsFill } from 'react-icons/ri'

export const githubUrl = 'https://github.com/ZachMcM/agent-rooms'
export const npmUrl = 'https://www.npmjs.com/package/agent-rooms'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'Agent Rooms', url: '/' },
    links: [
      { text: 'GitHub', url: githubUrl, external: true, on: 'nav' },
      {
        type: 'icon',
        text: 'GitHub',
        label: 'GitHub repository',
        icon: <RiGithubFill />,
        url: githubUrl,
        external: true,
        on: 'menu',
      },
      {
        type: 'icon',
        text: 'npm',
        label: 'npm package',
        icon: <RiNpmjsFill />,
        url: npmUrl,
        external: true,
        on: 'menu',
      },
    ],
  }
}
