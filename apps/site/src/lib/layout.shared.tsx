import { CoordRoomsLogo } from '@coordrooms/ui-library/components/coordrooms-logo'
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { RiGithubFill } from 'react-icons/ri'

export const githubUrl = 'https://github.com/ZachMcM/coordrooms'
export const npmUrl = 'https://www.npmjs.com/package/coordrooms'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <CoordRoomsLogo className="size-5" />
          <span>CoordRooms</span>
        </span>
      ),
      url: '/',
    },
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
