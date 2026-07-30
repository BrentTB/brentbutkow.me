import { useEffect, useState } from 'react'

/**
 * The window's inner height in pixels, tracked as it changes.
 *
 * Deliberately not an element measurement: sizing an element from its own observed box, when that box
 * is what the size feeds into, is a feedback cycle. The viewport is outside that cycle, so it can cap
 * an element's height without the measurement chasing its own tail.
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight
  )

  useEffect(() => {
    const measure = () => setHeight(window.innerHeight)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return height
}
