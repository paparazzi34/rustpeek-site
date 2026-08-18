/* Иконки — один набор, одна толщина линии (1.6), один размер по умолчанию.
   Никаких эмодзи в интерфейсе: они разъезжаются по платформам и выглядят
   как времянка. Эмодзи оставлены только там, где это осознанный акцент. */

type P = { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
})

export const IconSearch = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconServers = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3" y="4" width="18" height="7" rx="1.5" />
    <rect x="3" y="13" width="18" height="7" rx="1.5" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </svg>
)

export const IconUser = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
)

export const IconEye = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
  </svg>
)

export const IconBell = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
)

export const IconArrowLeft = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
  </svg>
)

export const IconChevronLeft = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
)

export const IconChevronRight = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)

export const IconChevronDown = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m5 9 7 7 7-7" />
  </svg>
)

export const IconAlert = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 8v5M12 16.5v.01" />
    <path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3l-7.8-13.5a2 2 0 0 0-3.4 0z" />
  </svg>
)

export const IconCheck = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
)

export const IconClock = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
)

export const IconFlag = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M5 21V4h13l-2.5 4.2L18 12.5H5" />
  </svg>
)

export const IconTelegram = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M21.7 4.3 2.9 11.5c-.9.3-.9 1.5 0 1.8l4.6 1.4 1.8 5.5c.2.7 1.1.9 1.6.3l2.5-2.7 4.6 3.4c.6.4 1.4.1 1.6-.6l3.1-15c.2-.8-.6-1.5-1.4-1.3zM8.8 14.4l9-6.4-7.3 7.3-.3 3.1-1.4-4z" />
  </svg>
)

export const IconExternal = ({ size = 14, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)

export const IconMap = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m9 4 6 2.5L21 4v14l-6 2.5L9 18l-6 2.5V6.5z" />
    <path d="M9 4v14M15 6.5v14" />
  </svg>
)
