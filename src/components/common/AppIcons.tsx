import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string
}

function IconBase({ children, className = 'h-4 w-4', title, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </IconBase>
  )
}

export function PlayTriangleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className ?? 'h-4 w-4'} aria-hidden="true">
      <polygon points="7 5 19 12 7 19 7 5" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </IconBase>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </IconBase>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 19h14" />
    </IconBase>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </IconBase>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

export function PulseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 12h4l2.5-4.5L13 16l2.5-4H21" />
    </IconBase>
  )
}

export function AntennaIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 14v6" />
      <path d="M9 20h6" />
      <circle cx="12" cy="10" r="2" />
      <path d="M6.5 6.5a8 8 0 0 1 11 0" />
      <path d="M4 4a11.5 11.5 0 0 1 16 0" />
    </IconBase>
  )
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3 19h18" />
    </IconBase>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.8v2.1" />
      <path d="M12 18.1v2.1" />
      <path d="M20.2 12h-2.1" />
      <path d="M5.9 12H3.8" />
      <path d="m17.8 6.2-1.5 1.5" />
      <path d="m7.7 16.3-1.5 1.5" />
      <path d="m17.8 17.8-1.5-1.5" />
      <path d="M7.7 7.7 6.2 6.2" />
    </IconBase>
  )
}

export function TrendUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 16l6-6 4 4 6-8" />
      <path d="M14 6h6v6" />
    </IconBase>
  )
}

export function WarningTriangleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 9v4.5" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

export function GridIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </IconBase>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 8.5h7l1.5 2H21v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5Z" />
      <path d="M3 8a2 2 0 0 1 2-2h4l1.5 2H19a2 2 0 0 1 2 2" />
    </IconBase>
  )
}

export function RobotIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="8" width="12" height="9" rx="3" />
      <path d="M12 4v4" />
      <circle cx="9.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9 16h6" />
      <path d="M8 20v-3" />
      <path d="M16 20v-3" />
    </IconBase>
  )
}

export function CurrencyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 8c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z" />
      <path d="M5 8v4c0 1.7 3.1 3 7 3s7-1.3 7-3V8" />
      <path d="M5 12v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
    </IconBase>
  )
}

export function BankIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 10h16" />
      <path d="M6 10v7" />
      <path d="M10 10v7" />
      <path d="M14 10v7" />
      <path d="M18 10v7" />
      <path d="M3 19h18" />
      <path d="M12 4 4 8v1h16V8l-8-4Z" />
    </IconBase>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </IconBase>
  )
}

export function QuoteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 8H5v5h4v3H5a2 2 0 0 1-2-2v-4a4 4 0 0 1 4-4h1v2Zm11 0h-3v5h4v3h-4a2 2 0 0 1-2-2v-4a4 4 0 0 1 4-4h1v2Z" />
    </IconBase>
  )
}

export function SatelliteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 8 4 5l2-2 3 3" />
      <path d="m17 16 3 3-2 2-3-3" />
      <path d="M8 7 17 16" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" />
      <path d="M14 5h5v5" />
      <path d="M5 14H0v5" />
    </IconBase>
  )
}

export function BadgeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </IconBase>
  )
}

export function TagIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12 12 20 4 12V5h7l9 7Z" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4" />
      <path d="M16 4v4" />
      <path d="M4 10h16" />
    </IconBase>
  )
}
