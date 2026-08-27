const topPaths = ['M0 160V132H82V86H30V0', 'M384 160V118H294V72H352V0', 'M768 160V136H684V91H738V0']

const bottomPaths = ['M0 0V28H96V77H42V160', 'M384 0V38H462V96H408V160', 'M768 0V25H676V84H730V160']

const leftCenterPath = 'M240 176H202V104H126V228H0'
const rightCenterPath = 'M0 176H44V238H121V119H240'

export function HeroLineField() {
  return (
    <div
      aria-hidden="true"
      className="text-border pointer-events-none absolute inset-0 grid grid-cols-[1fr_minmax(0,48rem)_1fr] grid-rows-[1fr_minmax(0,22rem)_1fr] opacity-60"
    >
      <svg
        className="col-start-1 row-start-2 h-full w-full"
        viewBox="0 0 240 352"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-lines-left-center" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <path
          d={leftCenterPath}
          fill="none"
          stroke="url(#hero-lines-left-center)"
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <svg
        className="col-start-2 row-start-1 h-full w-full"
        viewBox="0 0 768 160"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-lines-top" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#hero-lines-top)" strokeWidth="1.75">
          {topPaths.map((path) => (
            <path key={path} d={path} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>

      <div className="col-start-2 row-start-2" />

      <svg
        className="col-start-2 row-start-3 h-full w-full"
        viewBox="0 0 768 160"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-lines-bottom" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#hero-lines-bottom)" strokeWidth="1.75">
          {bottomPaths.map((path) => (
            <path key={path} d={path} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>

      <svg
        className="col-start-3 row-start-2 h-full w-full"
        viewBox="0 0 240 352"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-lines-right-center" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <path
          d={rightCenterPath}
          fill="none"
          stroke="url(#hero-lines-right-center)"
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
