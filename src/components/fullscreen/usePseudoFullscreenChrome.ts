import { useEffect } from 'react'

// Delays (ms) for the staggered scroll nudges. iOS finishes re-laying out a
// rotation at an unpredictable time, so an early scrollTo is silently ignored —
// firing a few times covers the settle window. The tail reaches past 600ms
// because a rotate can still be settling then.
const NUDGE_DELAYS = [0, 150, 350, 600, 900]

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
      // Safari only auto-hides its bars in response to real downward movement, and being at the bottom of
      // the page is not the same as the bars being hidden. Rotating to landscape shortens the page and
      // shrinks the viewport, so after a rotate the page is often already at its end — an earlier version
      // skipped the scroll in exactly that case and the bars stayed up for good. Going to the top first
      // guarantees there is somewhere to travel back down from; the overlay is fixed, so nothing visibly
      // moves either way.
      if (window.scrollY + window.innerHeight >= max) window.scrollTo(0, 0)
      window.scrollTo(0, max)
    }
    const nudge = () => {
      pending.forEach(clearTimeout)
      pending = NUDGE_DELAYS.map((delay) => setTimeout(hideChrome, delay))
    }
    nudge()

    window.addEventListener('orientationchange', nudge)
    window.addEventListener('resize', nudge)
    // The one iOS reports reliably: `orientationchange` is deprecated and `resize` does not always fire for a
    // rotate, but the visual viewport always changes size when the bars come back.
    window.visualViewport?.addEventListener('resize', nudge)
    return () => {
      pending.forEach(clearTimeout)
      window.removeEventListener('orientationchange', nudge)
      window.removeEventListener('resize', nudge)
      window.visualViewport?.removeEventListener('resize', nudge)
    }
  }, [active])
}
