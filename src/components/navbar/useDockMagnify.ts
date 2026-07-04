import { RefObject, useEffect } from 'react'

export const DOCK_RADIUS = 180
export const DOCK_BOOST = 0.15

// Raised-cosine falloff: full boost right at the cursor, easing smoothly to nothing at DOCK_RADIUS.
// No hard cutoff, so an item shrinks gradually as the pointer moves away rather than snapping back.
export function dockScale(distance: number, radius = DOCK_RADIUS, boost = DOCK_BOOST): number {
  const d = Math.abs(distance)
  if (d >= radius) return 1
  const falloff = 0.5 * (1 + Math.cos((Math.PI * d) / radius))
  return 1 + boost * falloff
}

// macOS-dock magnification for the navbar links, fun-mode only. Each `[data-dock-item]` scales by
// its distance from the pointer: horizontal to the item's centre, plus how far the pointer sits
// outside the bar vertically. Inside the bar that vertical term is 0, so sweeping along the row
// feels purely horizontal; drifting above/below the bar feeds the same falloff, so magnification
// fades out smoothly in every direction instead of holding until a cutoff. The CSS transition
// eases each change. Mouse-available devices only — touch never triggers it.
//
// The pointermove listener lives on `window` (not the nav) and reads the ref live on each move: the
// nav ref can be unpopulated when the effect first runs, and a window listener also can't be shadowed
// by an overlay sitting above the bar.
export function useDockMagnify(navRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    // any-pointer (not pointer): a mouse only needs to be *available* — a touchscreen laptop can
    // report touch as the primary pointer while still having a mouse the user is hovering with.
    if (!window.matchMedia?.('(any-pointer: fine)')?.matches) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return

    const items = () => {
      const nav = navRef.current
      return nav ? Array.from(nav.querySelectorAll<HTMLElement>('[data-dock-item]')) : []
    }

    const reset = () => {
      for (const el of items()) el.style.removeProperty('--dock-scale')
    }

    const onMove = (event: PointerEvent) => {
      const nav = navRef.current
      if (!nav) return
      const bounds = nav.getBoundingClientRect()
      // 0 while the pointer is within the bar's vertical extent; grows as it leaves.
      const dy = Math.max(bounds.top - event.clientY, event.clientY - bounds.bottom, 0)
      if (dy >= DOCK_RADIUS) {
        reset()
        return
      }
      for (const el of items()) {
        const rect = el.getBoundingClientRect()
        // transform-origin is centered horizontally, so the centre x is stable under scaling —
        // no feedback loop from measuring an already-scaled element.
        const dx = event.clientX - (rect.left + rect.width / 2)
        el.style.setProperty('--dock-scale', String(dockScale(Math.hypot(dx, dy))))
      }
    }

    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      reset()
    }
  }, [navRef, enabled])
}
