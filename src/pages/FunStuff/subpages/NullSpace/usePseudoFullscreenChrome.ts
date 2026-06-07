import { useEffect } from 'react'

// Delays (ms) for the staggered scroll nudges. iOS finishes re-laying out a
// rotation at an unpredictable time, so an early scrollTo is silently ignored —
// firing a few times covers the settle window.
const NUDGE_DELAYS = [0, 250, 500]

// iOS Safari has no Fullscreen API, so the game falls back to a CSS
// pseudo-fullscreen overlay. Safari keeps its URL / tab bar visible until the
// page scrolls, and re-shows it on every orientation change — eating vertical
// space. A 1px scroll nudge kicks Safari's auto-hide; this fires it on entry
// and again after each rotate so the bars don't creep back when the phone turns.
export function usePseudoFullscreenChrome(active: boolean) {
  useEffect(() => {
    if (!active) return

    let pending: ReturnType<typeof setTimeout>[] = []
    const nudge = () => {
      pending.forEach(clearTimeout)
      pending = NUDGE_DELAYS.map((delay) => setTimeout(() => window.scrollTo(0, 1), delay))
    }
    nudge()

    window.addEventListener('orientationchange', nudge)
    return () => {
      pending.forEach(clearTimeout)
      window.removeEventListener('orientationchange', nudge)
    }
  }, [active])
}
