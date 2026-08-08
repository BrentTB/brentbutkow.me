import { RefObject, useEffect, useRef, useState } from 'react'
import { evadeSpot, Point } from './engine/evade'

/** Where the target waits before anybody comes near it, inset from the arena's top-left corner. */
const RESTING_SPOT: Point = { x: 8, y: 8 }

type EvasiveTarget = {
  /** The area the target is confined to. Pointer movement is tracked here. */
  arenaRef: RefObject<HTMLDivElement>
  /** The control that runs away. */
  targetRef: RefObject<HTMLButtonElement>
  /** Where it sits, in the arena's own coordinates. Feed straight to `left`/`top`. */
  spot: Point
  /** How many times it has hopped. */
  dodges: number
}

/**
 * A control that will not be clicked. It watches the pointer inside its arena and hops a short distance
 * away whenever the cursor gets within `triggerDistance`, ricocheting off the walls so the chase stays
 * inside the pen and stays winnable.
 *
 * The position lives in state rather than being read back off the element. Measuring an element that a
 * CSS transition is still moving hands you a stale position, and feeding that back in compounds the
 * error every hop until the target is nowhere near the page.
 *
 * Keyboard focus is left alone on purpose: Tab reaches the control where it rests, and Enter presses it.
 */
export function useEvasiveTarget(triggerDistance: number, hopDistance: number): EvasiveTarget {
  const arenaRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLButtonElement>(null)
  const [spot, setSpot] = useState<Point>(RESTING_SPOT)
  const [dodges, setDodges] = useState(0)

  // The render reads state; the pointer handler needs the value without re-binding the listener.
  const spotRef = useRef(spot)
  spotRef.current = spot

  useEffect(() => {
    const arena = arenaRef.current
    if (arena === null) return

    const onPointerMove = (event: PointerEvent) => {
      const target = targetRef.current
      if (target === null) return

      const frame = arena.getBoundingClientRect()
      const { width, height } = target.getBoundingClientRect()

      const next = evadeSpot({
        cursor: { x: event.clientX - frame.left, y: event.clientY - frame.top },
        spot: spotRef.current,
        size: { width, height },
        arena: { width: arena.clientWidth, height: arena.clientHeight },
        triggerDistance,
        hopDistance,
      })

      if (next.x === spotRef.current.x && next.y === spotRef.current.y) return
      spotRef.current = next
      setSpot(next)
      setDodges((count) => count + 1)
    }

    arena.addEventListener('pointermove', onPointerMove)
    return () => arena.removeEventListener('pointermove', onPointerMove)
  }, [triggerDistance, hopDistance])

  return { arenaRef, targetRef, spot, dodges }
}
