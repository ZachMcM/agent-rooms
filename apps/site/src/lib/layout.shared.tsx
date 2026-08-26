import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { RiGithubFill } from 'react-icons/ri'

export const githubUrl = 'https://github.com/ZachMcM/coordrooms'
export const npmUrl = 'https://www.npmjs.com/package/coordrooms'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'CoordRooms', url: '/' },
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
    ],
  }
}
