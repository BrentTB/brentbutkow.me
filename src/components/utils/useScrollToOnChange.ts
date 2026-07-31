import { RefObject, useEffect, useRef } from 'react'
import { anchorScrollTop } from './anchor-scroll'

/** What a trigger may be. Change is detected by identity, so a fresh object would fire on every render. */
type ScrollTrigger = string | number | boolean | null | undefined

/**
 * Scrolls an element to the top of the view whenever `trigger` changes, leaving the first render alone.
 * The element's `scroll-margin-top` is honoured, so it can clear a sticky header.
 *
 * For panels that change height a lot: the scroll position that framed the old size frames the new one
 * badly, dumping you past the bottom of a short panel or above the end of a tall one.
 *
 * Two deliberate choices, both learned the hard way:
 *  - the position is computed and handed to `window.scrollTo` rather than delegated to `scrollIntoView`,
 *    which declines to move an element that is already visible, and "visible but in the wrong place" is
 *    exactly this case;
 *  - the jump is instant. Smooth programmatic scrolling is quietly ignored in some environments, and a
 *    move that sometimes does nothing at all is worse than one that is merely abrupt.
 */
export function useScrollToOnChange(ref: RefObject<HTMLElement | null>, trigger: ScrollTrigger) {
  const previous = useRef(trigger)

  /* The anchor is a dependency, not just something the effect reads. A trigger that changes while the
     anchor is unmounted has to stay pending until it appears, and keying only on the trigger would mean
     the effect never runs again to notice. */
  const element = ref.current

  useEffect(() => {
    // Nothing has changed yet on mount, and hijacking the initial scroll would be rude.
    if (previous.current === trigger) return
    if (element === null || typeof window === 'undefined') return

    // Marked as handled only once there is something to scroll, so a pending change is not spent for nothing.
    previous.current = trigger

    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0
    window.scrollTo({ top: anchorScrollTop(element, margin), behavior: 'auto' })
  }, [element, trigger])
}
