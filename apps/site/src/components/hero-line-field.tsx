const leftPaths = [
  'M0 0H35V120H100V250H180V340H240',
  'M0 90H70V220H150V340H240',
  'M0 520H65V430H165V365H220V340H240',
  'M0 600H35V500H100V420H180V340H240',
]

const rightPaths = [
  'M240 0H205V120H140V250H60V340H0',
  'M240 90H170V220H90V340H0',
  'M240 520H175V430H75V365H20V340H0',
  'M240 600H205V500H140V420H60V340H0',
]

const topPaths = [
  'M120 0V55H72V115H24V145H0V160',
  'M90 0V45H260V110H384V160',
  'M680 0V70H540V125H420V160H384',
  'M648 0V55H696V115H744V145H768V160',
]

const bottomPaths = [
  'M120 160V105H72V45H24V15H0V0',
  'M90 160V115H260V50H384V0',
  'M680 160V90H540V35H420V0H384',
  'M648 160V105H696V45H744V15H768V0',
]

export function HeroLineField() {
  return (
    <div
      aria-hidden="true"
      className="text-border pointer-events-none absolute inset-0 grid grid-cols-[1fr_minmax(0,48rem)_1fr] grid-rows-[1fr_minmax(0,22rem)_1fr] opacity-50"
    >
      <svg className="row-span-3 h-full w-full" viewBox="0 0 240 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hero-lines-left" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#hero-lines-left)" strokeWidth="1.5">
          {leftPaths.map((path) => (
            <path key={path} d={path} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>

      <svg
        className="col-start-2 row-start-1 h-full w-full"
        viewBox="0 0 768 160"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-lines-top" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#hero-lines-top)" strokeWidth="1.5">
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
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#hero-lines-bottom)" strokeWidth="1.5">
          {bottomPaths.map((path) => (
            <path key={path} d={path} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>

      <svg
        className="col-start-3 row-span-3 row-start-1 h-full w-full"
        viewBox="0 0 240 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-lines-right" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="32%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#hero-lines-right)" strokeWidth="1.5">
          {rightPaths.map((path) => (
            <path key={path} d={path} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>
    </div>
  )
}
