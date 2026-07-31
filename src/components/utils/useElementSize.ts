import { RefObject, useEffect, useState } from 'react'

export type ElementSize = {
  width: number
  height: number
}

/**
 * The live border-box size of an element in pixels, tracked as it resizes, or zeroes before it has been
 * measured. For layout that only the browser can answer: anything sizing itself to the room actually left
 * over has to measure rather than guess, and guessing in viewport units lands close and then drifts at the
 * sizes you did not test.
 *
 * The element must be mounted in the same commit as the hook — a ref that fills in later does not re-run
 * the effect, since a ref object keeps the same identity throughout.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (element === null) return

    /* A new object per observer tick would re-render everything downstream on every frame of a resize, so
       an unchanged measurement keeps the object it already handed out. */
    const apply = (width: number, height: number) =>
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      )

    const fromRect = () => {
      const rect = element.getBoundingClientRect()
      apply(rect.width, rect.height)
    }
    fromRect()

    // No ResizeObserver (jsdom, old browsers): the one measurement above still gives a usable answer.
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        /* Border-box, to match the first measurement: `contentRect` is content-box, so a padded element
           would jump by its padding the moment the observer first fired. `getBoundingClientRect` reports
           the transformed box, which is not what the observer is telling us about. */
        const border = entry.borderBoxSize?.[0]
        if (border) apply(border.inlineSize, border.blockSize)
        else fromRect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
