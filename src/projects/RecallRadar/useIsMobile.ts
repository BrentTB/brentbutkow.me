import { useEffect, useState } from 'react'

// The phone breakpoint the dashboard's mobile styles key off (see the ≤600px media queries).
const QUERY = '(max-width: 600px)'

const isPhoneWidth = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(QUERY).matches

// Tracks whether the viewport is phone-width, updating live on resize/rotate. Drives the mobile-only
// dashboard tweaks that CSS alone can't do (rendering the location scope as a dropdown, capping the
// outbreak cards). Returns false where matchMedia is unavailable (SSR / old runtimes).
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(isPhoneWidth)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return mobile
}
