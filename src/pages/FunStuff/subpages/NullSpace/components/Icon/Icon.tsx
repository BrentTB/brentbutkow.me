import type { ReactNode, SVGProps } from 'react'
import { IconName } from '../../icon-names'

export { IconName }

// Line-icon paths on a 24×24 grid, drawn with the shared stroke styling below
// (no per-path fill unless noted).
const PATHS: Record<IconName, ReactNode> = {
  [IconName.pause]: (
    <>
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  [IconName.fullscreen]: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </>
  ),
  [IconName.exitFullscreen]: (
    <>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </>
  ),
  // A solid rock head with three motion trails fanning off it.
  [IconName.meteorite]: (
    <>
      <circle cx="7" cy="17" r="3.5" fill="currentColor" stroke="none" />
      <path d="M9.5 13 15 6" />
      <path d="M10.5 14.5 17.5 8" />
      <path d="M11.5 16 18.5 11" />
    </>
  ),
  // Cratered sphere — reads as an asteroid/meteor without color.
  [IconName.meteor]: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  // A solid core wrapped by a tilted accretion disk — an event horizon.
  [IconName.blackHole]: (
    <>
      <ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-25 12 12)" />
      <circle cx="12" cy="12" r="3.8" fill="currentColor" stroke="none" />
    </>
  ),
  [IconName.rocket]: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  [IconName.shield]: (
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  [IconName.sun]: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  // Friendly robot ally.
  [IconName.helper]: (
    <>
      <path d="M12 8V4H8" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </>
  ),
  [IconName.telekinesis]: (
    <>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </>
  ),
  // Flame — a fiery beam.
  [IconName.solarFlare]: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  // Refresh ring wrapping a shield.
  [IconName.shieldRegen]: (
    <>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M12 8.5 9 9.6v2.4c0 1.7 1.3 2.9 3 3.4 1.7-.5 3-1.7 3-3.4V9.6Z" />
    </>
  ),
  // Arrowhead zooming off with trailing speed lines — a long, fast dash.
  [IconName.escape]: (
    <>
      <path d="M2 9h6" />
      <path d="M2 12h9" />
      <path d="M2 15h6" />
      <path d="M12 6.5 21 12l-9 5.5z" fill="currentColor" stroke="none" />
    </>
  ),
}

type IconProps = { name: IconName } & SVGProps<SVGSVGElement>

// Sized to 1em so it inherits the call site's font-size (the HUD scales icons
// via font-size), and stroked in currentColor so it picks up text / hover /
// disabled colors for free. Decorative — the buttons carry their own labels.
export function Icon({ name, style, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      // block removes the inline-svg baseline gap so it centers in its button
      style={{ display: 'block', ...style }}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
