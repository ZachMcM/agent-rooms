import { CoordRoomsLogo } from '@coordrooms/ui-library/components/coordrooms-logo'
import { ImageResponse } from 'next/og'

import { siteName, siteTagline } from '@/lib/site'

export const dynamic = 'force-static'

const size = { width: 1280, height: 360 }

function BannerLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1280 360"
      fill="none"
      style={{ height: 360, left: 0, position: 'absolute', top: 0, width: 1280 }}
    >
      <defs>
        <linearGradient
          id="banner-lines-left"
          x1="0"
          y1="0"
          x2="320"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3f3f46" stopOpacity="0" />
          <stop offset="0.35" stopColor="#3f3f46" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3f3f46" />
        </linearGradient>
        <linearGradient
          id="banner-lines-right"
          x1="1280"
          y1="0"
          x2="960"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3f3f46" stopOpacity="0" />
          <stop offset="0.35" stopColor="#3f3f46" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3f3f46" />
        </linearGradient>
      </defs>

      <g stroke="url(#banner-lines-left)" strokeWidth="1.5" opacity="0.45">
        <path d="M0 42H90V105H170V150H320" />
        <path d="M0 318H90V255H170V210H320" />
      </g>
      <g stroke="url(#banner-lines-right)" strokeWidth="1.5" opacity="0.45">
        <path d="M1280 42H1190V105H1110V150H960" />
        <path d="M1280 318H1190V255H1110V210H960" />
      </g>
    </svg>
  )
}

export function GET() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#09090b',
        color: '#fafafa',
        display: 'flex',
        fontFamily: 'Arial, sans-serif',
        height: '100%',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <BannerLines />

      <div style={{ alignItems: 'center', display: 'flex', gap: 28 }}>
        <CoordRoomsLogo style={{ height: 76, width: 76 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 62,
              fontWeight: 600,
              letterSpacing: '-0.05em',
              lineHeight: 1,
            }}
          >
            {siteName}
          </div>
          <div
            style={{
              color: '#a1a1aa',
              display: 'flex',
              fontSize: 27,
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
            }}
          >
            {siteTagline}
          </div>
        </div>
      </div>
    </div>,
    size,
  )
}
