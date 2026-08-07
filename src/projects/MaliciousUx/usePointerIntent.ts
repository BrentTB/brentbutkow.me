import { useMemo, useRef } from 'react'

type PointerIntent = {
  /** True when the press being handled came from a pointer rather than the keyboard. */
  viaPointer: { current: boolean }
  /** Spread onto the control whose behaviour depends on how it was pressed. */
  intentProps: {
    onPointerDown: () => void
    onKeyDown: () => void
  }
}

/**
 * Which input device is driving a control right now. Every hostile exhibit in this museum reads it for
 * the same reason: the mouse is the thing being trolled, and the keyboard path has to stay honest, so a
 * control reached by Tab and pressed with Enter does exactly what its label says.
 *
 * Order is what makes it work — `pointerdown` and `keydown` both land before the `click` that reads the
 * flag, so the click always knows which one it was.
 */
export function usePointerIntent(): PointerIntent {
  const viaPointer = useRef(false)

  const intentProps = useMemo(
    () => ({
      onPointerDown: () => {
        viaPointer.current = true
      },
      onKeyDown: () => {
        viaPointer.current = false
      },
    }),
    []
  )

  return { viaPointer, intentProps }
}
