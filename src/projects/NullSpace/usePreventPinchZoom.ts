import { useEffect } from 'react'

// Blocks browser pinch-zoom for the lifetime of the game. The canvas uses
// `touch-action: none` for slingshot drags, so a page that's been pinched-in
// can't be pinched back out mid-play — the cleaner fix is to stop the zoom
// happening at all. Covers iOS Safari's `gesture*` events and the two-finger
// `touchmove` used elsewhere; single-finger drags/taps are untouched. Listeners
// live at the document level (gesture events don't usefully bubble from a child)
// and are removed on unmount, so zoom works normally elsewhere on the site.
export function usePreventPinchZoom(): void {
  useEffect(() => {
    const prevent: EventListener = (e) => e.preventDefault()
    const preventMultiTouch: EventListener = (e) => {
      if ((e as TouchEvent).touches.length > 1) e.preventDefault()
    }

    const opts: AddEventListenerOptions = { passive: false }
    const bindings: Array<[string, EventListener]> = [
      ['gesturestart', prevent],
      ['gesturechange', prevent],
      ['gestureend', prevent],
      ['touchmove', preventMultiTouch],
    ]
    bindings.forEach(([type, handler]) => document.addEventListener(type, handler, opts))
    return () =>
      bindings.forEach(([type, handler]) => document.removeEventListener(type, handler, opts))
  }, [])
}
