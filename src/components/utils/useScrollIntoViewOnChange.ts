import { RefObject, useEffect, useRef } from 'react'

/**
 * Scrolls an element to the top of the view whenever `trigger` changes, leaving the first render alone.
 * The element's `scroll-margin-top` is honoured, so it can clear a sticky header.
 *
 * For panels that change height a lot: the scroll position that framed the old size frames the new one
 * badly, dumping you past the bottom of a short panel or above the end of a tall one.
 *
 * Two deliberate choices, both learned the hard way:
 *  - the position is computed rather than delegated to `scrollIntoView`, which declines to move an
 *    element that is already visible, and "visible but in the wrong place" is exactly this case;
 *  - the jump is instant. Smooth programmatic scrolling is quietly ignored in some environments, and a
 *    move that sometimes does nothing at all is worse than one that is merely abrupt.
 */
export function useScrollIntoViewOnChange(ref: RefObject<HTMLElement | null>, trigger: unknown) {
  const previous = useRef(trigger)

  useEffect(() => {
    // Nothing has changed yet on mount, and hijacking the initial scroll would be rude.
    if (previous.current === trigger) return
    previous.current = trigger

    const element = ref.current
    if (element === null || typeof window === 'undefined') return

    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0
    const top = element.getBoundingClientRect().top + window.scrollY - margin

    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  }, [ref, trigger])
}
