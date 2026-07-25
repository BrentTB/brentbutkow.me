import { PointerEvent as ReactPointerEvent, RefObject, useCallback, useMemo, useRef } from 'react'
import { CellPoint } from './pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH } from './data'

export type PointerBrushHandlers = {
  onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLCanvasElement>): void
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value))
}

/**
 * Turns pointer positions into grid cells and reports each drag segment. One path covers mouse,
 * touch and pen; pointer capture keeps a drag alive after it leaves the canvas.
 */
export function usePointerBrush(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onStroke: (from: CellPoint, to: CellPoint) => void
): PointerBrushHandlers {
  const lastRef = useRef<CellPoint | null>(null)

  const toCell = useCallback(
    (clientX: number, clientY: number): CellPoint | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null

      return {
        x: clamp(Math.floor(((clientX - rect.left) / rect.width) * GRID_WIDTH), GRID_WIDTH - 1),
        y: clamp(Math.floor(((clientY - rect.top) / rect.height) * GRID_HEIGHT), GRID_HEIGHT - 1),
      }
    },
    [canvasRef]
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const cell = toCell(event.clientX, event.clientY)
      if (!cell) return

      event.currentTarget.setPointerCapture?.(event.pointerId)
      lastRef.current = cell
      onStroke(cell, cell)
    },
    [toCell, onStroke]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const from = lastRef.current
      if (!from) return

      const to = toCell(event.clientX, event.clientY)
      if (!to) return

      lastRef.current = to
      onStroke(from, to)
    },
    [toCell, onStroke]
  )

  const endStroke = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    lastRef.current = null
    const canvas = event.currentTarget
    // Releasing a pointer that was never captured throws, and pointercancel can arrive without it.
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  }, [])

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endStroke,
      onPointerCancel: endStroke,
    }),
    [onPointerDown, onPointerMove, endStroke]
  )
}
