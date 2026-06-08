import { useEffect } from 'react'

// Delays (ms) for the staggered scroll nudges. iOS finishes re-laying out a
// rotation at an unpredictable time, so an early scrollTo is silently ignored —
// firing a few times covers the settle window.
const NUDGE_DELAYS = [0, 150, 350, 600]

// iOS Safari has no Fullscreen API, so the game falls back to a CSS
// pseudo-fullscreen overlay. Safari keeps its URL / tab bar visible until the
// page scrolls past a threshold, and re-shows it on every orientation change —
// eating vertical space. Scrolling to the bottom of the page trips Safari's
// auto-hide (a 1px nudge isn't enough for the newer tab bar); the fixed overlay
// covers the viewport regardless of scroll position, so the page never visibly
// moves. Fires on entry and again after each rotate / viewport resize so the
// bars don't creep back when the phone turns.
export function usePseudoFullscreenChrome(active: boolean) {
  useEffect(() => {
    if (!active) return

    let pending: ReturnType<typeof setTimeout>[] = []
    const hideChrome = () => {
      const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      // Skip if already at the bottom, so the resize Safari fires while hiding its
      // own chrome doesn't bounce back into another scroll.
      if (window.scrollY + window.innerHeight >= max) return
      window.scrollTo(0, max)
    }
    const nudge = () => {
      pending.forEach(clearTimeout)
      pending = NUDGE_DELAYS.map((delay) => setTimeout(hideChrome, delay))
    }
    nudge()

    window.addEventListener('orientationchange', nudge)
    window.addEventListener('resize', nudge)
    return () => {
      pending.forEach(clearTimeout)
      window.removeEventListener('orientationchange', nudge)
      window.removeEventListener('resize', nudge)
    }
  }, [active])
}
