const diagramProps = {
  'aria-hidden': true,
  className: 'h-full w-full',
  fill: 'none',
  viewBox: '0 0 360 280',
} as const

export function SharedRoomDiagram() {
  return (
    <svg {...diagramProps}>
      <g className="stroke-border" strokeWidth="1.25">
        <path d="M180 64 278 116 180 168 82 116 180 64Z" />
        <path d="m82 116 98 52 98-52" />
        <path d="M82 136 180 188 278 136" />
        <path d="M82 156 180 208 278 156" />
        <path d="M82 176 180 228 278 176" />
      </g>

      <path
        className="stroke-muted-foreground/35"
        d="M82 116v60l98 52 98-52v-60"
        strokeDasharray="3 6"
        strokeWidth="1.25"
      />

      <g className="stroke-foreground/65" strokeWidth="1.5">
        <path d="M180 88 235 117 180 146 125 117 180 88Z" />
        <path d="M150 116h60" />
        <path d="M161 108h38" />
        <path d="M161 125h38" />
      </g>

      <g className="fill-background stroke-foreground/55" strokeWidth="1.25">
        <circle cx="82" cy="116" r="6" />
        <circle cx="180" cy="64" r="6" />
        <circle cx="278" cy="116" r="6" />
      </g>
      <g className="fill-foreground/55">
        <circle cx="82" cy="116" r="2" />
        <circle cx="180" cy="64" r="2" />
        <circle cx="278" cy="116" r="2" />
      </g>
    </svg>
  )
}

export function LifecycleDeliveryDiagram() {
  return (
    <svg {...diagramProps}>
      <g className="stroke-muted-foreground/35" strokeDasharray="4 6" strokeWidth="1.25">
        <path d="m180 137-68-39" />
        <path d="m180 137 68-39" />
        <path d="m180 137-68 39" />
        <path d="m180 137 68 39" />
      </g>

      <g className="stroke-border" strokeWidth="1.25">
        <path d="m112 48 48 26v54l-48 26-48-26V74l48-26Z" />
        <path d="m248 48 48 26v54l-48 26-48-26V74l48-26Z" />
        <path d="m112 126 48 26v54l-48 26-48-26v-54l48-26Z" />
        <path d="m248 126 48 26v54l-48 26-48-26v-54l48-26Z" />
        <path d="m64 74 48 26 48-26" />
        <path d="m200 74 48 26 48-26" />
        <path d="m64 152 48 26 48-26" />
        <path d="m200 152 48 26 48-26" />
      </g>

      <g className="fill-background stroke-foreground/65" strokeWidth="1.5">
        <path d="m180 106 54 31-54 31-54-31 54-31Z" />
        <path d="m126 137 54 31 54-31v18l-54 31-54-31v-18Z" />
      </g>
      <path className="stroke-foreground/65" d="M157 137h46" strokeWidth="1.5" />
      <circle className="fill-foreground/65" cx="180" cy="137" r="3" />
    </svg>
  )
}

export function LocalHistoryDiagram() {
  const layers = [
    { x: 82, y: 166, width: 196, height: 32 },
    { x: 91, y: 151, width: 178, height: 35 },
    { x: 101, y: 133, width: 158, height: 41 },
    { x: 113, y: 112, width: 134, height: 50 },
    { x: 126, y: 87, width: 108, height: 61 },
    { x: 141, y: 58, width: 78, height: 76 },
  ]

  return (
    <svg {...diagramProps}>
      <g className="stroke-border" strokeWidth="1.25">
        {layers.map((layer) => (
          <rect
            key={layer.y}
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            rx="5"
          />
        ))}
      </g>

      <g className="stroke-muted-foreground/45" strokeWidth="1.25">
        <path d="M101 177h158" />
        <path d="M113 162h134" />
        <path d="M126 145h108" />
        <path d="M141 124h78" />
        <path d="M154 101h52" />
      </g>

      <g className="stroke-foreground/65" strokeWidth="1.5">
        <rect x="151" y="73" width="58" height="45" rx="4" />
        <path d="M163 87h34" />
        <path d="M163 96h25" />
        <path d="M163 105h18" />
      </g>
    </svg>
  )
}
