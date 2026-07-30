import { RefObject, useEffect, useState } from 'react'

export type ElementSize = {
  width: number
  height: number
}

/**
 * The live border-box size of an element in pixels, tracked as it resizes, or zeroes before it has
 * been measured. For layout that only the browser can answer: anything sizing itself to the room
 * actually left over has to measure rather than guess, and guessing in viewport units lands close
 * and then drifts at the sizes you did not test.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (element === null) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      setSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height }
      )
    }
    measure()

    // No ResizeObserver (jsdom, old browsers): the one measurement above still gives a usable answer.
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
