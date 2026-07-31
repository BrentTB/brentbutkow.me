import { useEffect, useState } from 'react'

/**
 * The window's inner height in pixels, tracked as it changes.
 *
 * Deliberately not an element measurement: sizing an element from its own observed box, when that box is
 * what the size feeds into, is a feedback cycle. The viewport is outside that cycle, so it can cap an
 * element's height without the measurement chasing its own tail.
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight
  )

  useEffect(() => {
    const measure = () => setHeight(window.innerHeight)
    measure()

    /* iOS Safari fires `orientationchange` before `innerHeight` reports the new orientation, so measuring
       there and then stores the height the phone had a moment ago. A frame later it is the new one. */
    let pending: number | undefined
    const measureAfterRotation = () => {
      if (pending !== undefined) cancelAnimationFrame(pending)
      pending = requestAnimationFrame(() => {
        pending = undefined
        measure()
      })
    }

    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measureAfterRotation)
    return () => {
      if (pending !== undefined) cancelAnimationFrame(pending)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measureAfterRotation)
    }
  }, [])

  return height
}
