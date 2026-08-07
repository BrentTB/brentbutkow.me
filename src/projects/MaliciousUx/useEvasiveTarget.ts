import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { evadeOffset } from './engine/evade'
import { Offset } from './malicious-ux.types'

const AT_REST: Offset = { x: 0, y: 0 }

type EvasiveTarget = {
  /** The area the target is confined to. Pointer movement is tracked here. */
  arenaRef: RefObject<HTMLDivElement>
  /** The control that runs away. */
  targetRef: RefObject<HTMLButtonElement>
  /** Current displacement from its resting position, for a `translate`. */
  offset: Offset
  /** How many times it has bolted since the last reset. */
  dodges: number
  /** Put it back and forget the count. */
  settle: () => void
}

/**
 * A control that will not be clicked. It watches the pointer inside its arena and runs directly away
 * whenever the cursor gets within `triggerDistance`, staying inside the arena so it can never be chased
 * off the page.
 *
 * Keyboard focus is left alone on purpose: Tab reaches the control where it rests, and Enter presses it.
 */
export function useEvasiveTarget(triggerDistance: number): EvasiveTarget {
  const arenaRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLButtonElement>(null)
  const [offset, setOffset] = useState<Offset>(AT_REST)
  const [dodges, setDodges] = useState(0)

  // The render reads state; the pointer handler needs the value without re-binding the listener.
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  useEffect(() => {
    const arena = arenaRef.current
    if (arena === null) return

    const onPointerMove = (event: PointerEvent) => {
      const target = targetRef.current
      if (target === null) return

      const next = evadeOffset({
        cursor: { x: event.clientX, y: event.clientY },
        target: target.getBoundingClientRect(),
        bounds: arena.getBoundingClientRect(),
        triggerDistance,
        offset: offsetRef.current,
      })

      if (next.x === offsetRef.current.x && next.y === offsetRef.current.y) return
      offsetRef.current = next
      setOffset(next)
      setDodges((count) => count + 1)
    }

    arena.addEventListener('pointermove', onPointerMove)
    return () => arena.removeEventListener('pointermove', onPointerMove)
  }, [triggerDistance])

  const settle = useCallback(() => {
    offsetRef.current = AT_REST
    setOffset(AT_REST)
    setDodges(0)
  }, [])

  return { arenaRef, targetRef, offset, dodges, settle }
}
