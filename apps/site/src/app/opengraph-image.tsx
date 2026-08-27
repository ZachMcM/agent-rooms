import { CoordRoomsLogo } from '@coordrooms/ui-library/components/coordrooms-logo'
import { ImageResponse } from 'next/og'

import { siteDescription, siteName, siteTagline } from '@/lib/site'

export const alt = `${siteName}: ${siteTagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const lineColor = '#3f3f46'

function HeroLineField() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 630"
      fill="none"
      style={{ height: 630, left: 0, position: 'absolute', top: 0, width: 1200 }}
    >
      <defs>
        <linearGradient
          id="lines-left"
          x1="0"
          y1="0"
          x2="250"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={lineColor} stopOpacity="0" />
          <stop offset="0.32" stopColor={lineColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={lineColor} />
        </linearGradient>
        <linearGradient
          id="lines-right"
          x1="1200"
          y1="0"
          x2="950"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={lineColor} stopOpacity="0" />
          <stop offset="0.32" stopColor={lineColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={lineColor} />
        </linearGradient>
        <linearGradient id="lines-top" x1="0" y1="0" x2="0" y2="145" gradientUnits="userSpaceOnUse">
          <stop stopColor={lineColor} stopOpacity="0" />
          <stop offset="0.32" stopColor={lineColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={lineColor} />
        </linearGradient>
        <linearGradient
          id="lines-bottom"
          x1="0"
          y1="630"
          x2="0"
          y2="485"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={lineColor} stopOpacity="0" />
          <stop offset="0.32" stopColor={lineColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={lineColor} />
        </linearGradient>
      </defs>

      <g stroke="url(#lines-left)" strokeWidth="1.5" opacity="0.4">
        <path d="M0 30H65V115H130V220H250" />
        <path d="M0 600H45V520H120V440H190V385H250" />
      </g>
      <g stroke="url(#lines-right)" strokeWidth="1.5" opacity="0.4">
        <path d="M1200 30H1135V115H1070V220H950" />
        <path d="M1200 600H1155V520H1080V440H1010V385H950" />
      </g>
      <g stroke="url(#lines-top)" strokeWidth="1.5" opacity="0.4">
        <path d="M300 0V50H350V100H430V145" />
        <path d="M900 0V50H850V100H770V145" />
      </g>
      <g stroke="url(#lines-bottom)" strokeWidth="1.5" opacity="0.4">
        <path d="M300 630V580H350V530H430V485" />
        <path d="M900 630V580H850V530H770V485" />
      </g>
    </svg>
  )
}

export default function OpenGraphImage() {
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
      <HeroLineField />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 860,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            border: '1px solid #3f3f46',
            borderRadius: 999,
            alignItems: 'center',
            display: 'flex',
            fontSize: 22,
            fontWeight: 500,
            gap: 10,
            height: 52,
            letterSpacing: '-0.02em',
            marginBottom: 34,
            padding: '0 20px',
          }}
        >
          <CoordRoomsLogo style={{ height: 22, width: 22 }} />
          <span style={{ display: 'flex', lineHeight: '22px' }}>{siteName}</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 68,
            fontWeight: 600,
            letterSpacing: '-0.055em',
            lineHeight: 0.98,
          }}
        >
          {siteTagline}
        </div>
        <div
          style={{
            color: '#a1a1aa',
            display: 'flex',
            fontSize: 26,
            lineHeight: 1.4,
            marginTop: 30,
            maxWidth: 760,
          }}
        >
          {siteDescription}
        </div>
      </div>
    </div>,
    size,
  )
}
