import { RefObject, useCallback, useEffect, useState } from 'react'

export type Fullscreen = {
  isFullscreen: boolean
  /** False where the browser has no Fullscreen API, so the control can stay hidden rather than fail. */
  supported: boolean
  toggle(): void
}

/**
 * Puts one element full screen and tracks whether it currently is. The flag follows the document rather
 * than the click, so leaving with Escape or the browser's own control keeps the UI honest.
 */
export function useFullscreen(elementRef: RefObject<HTMLElement | null>): Fullscreen {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(typeof document.exitFullscreen === 'function')

    const sync = () => setIsFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    sync()

    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    // Both calls reject when the gesture isn't trusted or the element is gone; either way the flag stays
    // where the document says it is, so a refused request can't leave the page pretending.
    if (document.fullscreenElement === null) void element.requestFullscreen?.()?.catch(() => {})
    else void document.exitFullscreen?.()?.catch(() => {})
  }, [elementRef])

  return { isFullscreen, supported, toggle }
}
