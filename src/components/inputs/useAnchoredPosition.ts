import { useLayoutEffect, useState, type RefObject } from 'react'

type Coords = { top: number; left: number; width: number }

// Positions a body-portaled menu under (or above) its anchor, flipping up when there isn't room
// below and there's more room above. Returns viewport coords for `position: fixed`; null until
// measured so the menu never flashes at the origin. Re-measures on scroll (capture, to catch a
// scrolling ancestor) and resize, and whenever `reflowKey` changes — pass the menu's option count
// so an async list that grows/shrinks after open re-flips correctly.
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement>,
  menuRef: RefObject<HTMLElement>,
  open: boolean,
  reflowKey?: unknown
): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    const place = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const menuHeight = menuRef.current?.offsetHeight ?? 0
      const spaceBelow = window.innerHeight - rect.bottom
      const up = menuHeight + 8 > spaceBelow && rect.top > spaceBelow
      setCoords({
        top: up ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, reflowKey, anchorRef, menuRef])

  return coords
}
