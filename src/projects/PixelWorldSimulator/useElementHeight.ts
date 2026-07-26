import { RefObject, useEffect, useState } from 'react'

/**
 * The live height of an element in pixels, tracked as it resizes, or 0 before it has been measured.
 *
 * Layout is the only place the answer exists: the canvas takes its height from its own aspect ratio against
 * whatever width the page gives it, so anything that wants to fit itself to the canvas has to measure rather
 * than guess. Guessing in CSS with viewport units lands close and then drifts at sizes you did not test.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (element === null) return

    setHeight(element.getBoundingClientRect().height)

    // No ResizeObserver (jsdom, old browsers): the one measurement above still gives a usable answer.
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Border-box, to match the first measurement above: contentRect is content-box, so a padded or
        // bordered element would jump by its padding the moment the observer first fired.
        const border = entry.borderBoxSize?.[0]?.blockSize
        setHeight(border ?? entry.target.getBoundingClientRect().height)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return height
}
