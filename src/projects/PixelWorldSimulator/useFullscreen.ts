import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { usePseudoFullscreenChrome } from '../../components/fullscreen/usePseudoFullscreenChrome'
import { resetPinchZoom } from '../../components/fullscreen/reset-pinch-zoom'

export type Fullscreen = {
  isFullscreen: boolean
  /** Always true: where the Fullscreen API is missing, the fixed overlay stands in for it. */
  supported: boolean
  /** True while standing in for the API rather than using it, so the layout can lift itself over the page. */
  isPseudo: boolean
  toggle(): void
}

/**
 * Puts the world full screen: by the Fullscreen API where there is one, and by a fixed overlay where there is
 * not. iPhone Safari has no element full screen at all — iPadOS does — so the old check hid the control
 * entirely on the device that needs it most.
 *
 * The same two-mode approach Null Space arrived at, now sharing its parts: the chrome-hiding nudges and the
 * pinch-zoom reset live in `components/fullscreen` and both games use them.
 */
export function useFullscreen(elementRef: RefObject<HTMLElement | null>): Fullscreen {
  const [isReal, setIsReal] = useState(false)
  const [isPseudo, setIsPseudo] = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => () => void (mountedRef.current = false), [])

  useEffect(() => {
    // The flag follows the document rather than the click, so leaving with Escape or the browser's own
    // control keeps the UI honest.
    const sync = () => setIsReal(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    sync()

    return () => {
      document.removeEventListener('fullscreenchange', sync)
      // Leaving the page while it is full screen would otherwise strand the browser there with nothing to
      // show — the world it was filling has gone.
      if (document.fullscreenElement !== null) void document.exitFullscreen?.()?.catch(() => {})
    }
  }, [])

  // Safari holds its URL bar over a fixed overlay until the page scrolls, and brings it back on every rotate.
  usePseudoFullscreenChrome(isPseudo)

  const toggle = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    if (document.fullscreenElement !== null) {
      void document.exitFullscreen?.()?.catch(() => {})
      return
    }
    if (isPseudo) {
      setIsPseudo(false)
      return
    }

    // A pinch-zoom from before entering is stuck once the canvas starts eating touches, so it goes back to
    // normal on the way in.
    resetPinchZoom()
    if (typeof element.requestFullscreen === 'function') {
      // Rejected counts as much as absent: a browser can have the method and refuse the call.
      element.requestFullscreen().catch(() => mountedRef.current && setIsPseudo(true))
    } else {
      setIsPseudo(true)
    }
  }, [elementRef, isPseudo])

  return { isFullscreen: isReal || isPseudo, supported: true, isPseudo, toggle }
}
