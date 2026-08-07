import { RefObject, useEffect, useRef } from 'react'

/**
 * Fires when an element leaves the viewport and comes back. The setting that quietly returns to its
 * default while you were scrolling elsewhere is built on exactly this: nothing is reset while you are
 * looking at it.
 *
 * `onReturn` is read through a ref so a parent re-render never tears down the observer mid-scroll.
 * Environments without `IntersectionObserver` (jsdom, old runtimes) simply never fire, which leaves the
 * exhibit honest rather than broken.
 */
export function useOffscreenReset<T extends HTMLElement>(onReturn: () => void): RefObject<T> {
  const ref = useRef<T>(null)
  const onReturnRef = useRef(onReturn)
  onReturnRef.current = onReturn

  useEffect(() => {
    const element = ref.current
    if (element === null || typeof IntersectionObserver !== 'function') return

    let wasHidden = false
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          wasHidden = true
        } else if (wasHidden) {
          wasHidden = false
          onReturnRef.current()
        }
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return ref
}
