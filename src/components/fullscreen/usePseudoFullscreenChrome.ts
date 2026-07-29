import { useEffect } from 'react'

// Delays (ms) for the staggered scroll nudges. iOS finishes re-laying out a
// rotation at an unpredictable time, so an early scrollTo is silently ignored —
// firing a few times covers the settle window. The tail reaches past 600ms
// because a rotate can still be settling then.
const NUDGE_DELAYS = [0, 150, 350, 600, 900]

// iOS Safari has no Fullscreen API, so the game falls back to a CSS
// pseudo-fullscreen overlay. Safari keeps its URL / tab bar visible until the
// page scrolls past a threshold, so entering pseudo-fullscreen scrolls to the
// bottom once to trip the auto-hide. The overlay is fixed, so nothing visibly
// moves.
//
// It only nudges on entry and on a rotate, and never in response to the viewport
// resizing on its own. Watching `visualViewport` for that was worse than not
// trying: the bars coming or going *is* a visual-viewport resize, so a nudge
// fired mid-gesture and scrolled the page out from under the swipe. Dismissing
// the chrome by hand stopped working entirely, and a swipe anywhere near the
// controls brought it back. Safari hides its own bars when the user scrolls; the
// page's job is to not fight that.
export function usePseudoFullscreenChrome(active: boolean) {
  useEffect(() => {
    if (!active) return

    let pending: ReturnType<typeof setTimeout>[] = []
    const hideChrome = () => {
      const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      // Only travel downward. The old version jumped to the top first when the page was already at its end,
      // to guarantee somewhere to scroll back down from, and that upward jump is what a user swiping the
      // chrome away was fighting. A nudge that finds nowhere to go now does nothing instead.
      if (window.scrollY + window.innerHeight < max) window.scrollTo(0, max)
    }
    const nudge = () => {
      pending.forEach(clearTimeout)
      pending = NUDGE_DELAYS.map((delay) => setTimeout(hideChrome, delay))
    }
    nudge()

    // A rotate is the one case worth re-nudging for: it relays out the page and puts the bars back with no
    // gesture involved, so there is nothing to interrupt.
    window.addEventListener('orientationchange', nudge)
    return () => {
      pending.forEach(clearTimeout)
      window.removeEventListener('orientationchange', nudge)
    }
  }, [active])
}
