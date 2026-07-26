import { useLayoutEffect, useState, type RefObject } from 'react'

type Coords = {
  top: number
  left: number
  width: number
  /** The tallest the menu may be where it is going, so a list too long for the room scrolls itself. */
  maxHeight: number
}

// Positions a body-portaled menu under (or above) its anchor, flipping up when there isn't room
// below and there's more room above. Returns viewport coords for `position: fixed`; null until
// measured so the menu never flashes at the origin. Re-measures on scroll (capture, to catch a
// scrolling ancestor) and resize, and whenever `reflowKey` changes — pass the menu's option count
// so an async list that grows/shrinks after open re-flips correctly.
//
// It also reports how much room the chosen side has. On a short screen — a phone held sideways is
// 390px tall — a five-option menu fits neither above nor below, and without a cap the tail of the
// list sat off the edge of the screen with no way to reach it.
/** Breathing room between the menu and its anchor, and between the menu and the edge of the screen. */
const GAP = 4
/**
 * The least room a menu is given, however tight the screen. Below about this it is not a menu any more, and
 * a scrollable stub is still better than a list whose options are off the edge.
 */
const MIN_ROOM = 96

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
      const spaceAbove = rect.top
      const up = menuHeight + GAP > spaceBelow && spaceAbove > spaceBelow
      const room = up ? spaceAbove : spaceBelow
      setCoords({
        top: up
          ? Math.max(GAP, rect.top - Math.min(menuHeight, room - GAP) - GAP)
          : rect.bottom + GAP,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(MIN_ROOM, room - GAP * 2),
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
