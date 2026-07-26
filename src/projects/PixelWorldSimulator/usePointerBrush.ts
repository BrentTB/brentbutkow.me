import {
  PointerEvent as ReactPointerEvent,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { CellPoint } from './pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH } from './data'

export type PointerBrushHandlers = {
  onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLCanvasElement>): void
  onPointerLeave(event: ReactPointerEvent<HTMLCanvasElement>): void
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value))
}

/**
 * Turns pointer positions into grid cells and reports each drag segment. One path covers mouse,
 * touch and pen; pointer capture keeps a drag alive after it leaves the canvas. Holding still keeps
 * painting: the last cell is restamped every frame, so a held pointer pours a stream.
 */
export function usePointerBrush(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onStroke: (from: CellPoint, to: CellPoint) => void,
  /** Left out on a touch screen: there is no hovering there, so there is nothing to report. */
  onHover: (cell: CellPoint | null) => void = () => {}
): PointerBrushHandlers {
  const lastRef = useRef<CellPoint | null>(null)

  // Read through refs so changing material or brush size mid-stroke doesn't restart the loop.
  const strokeRef = useRef(onStroke)
  strokeRef.current = onStroke
  const hoverRef = useRef(onHover)
  hoverRef.current = onHover

  useEffect(() => {
    let frame = requestAnimationFrame(pour)

    function pour() {
      frame = requestAnimationFrame(pour)
      const held = lastRef.current
      if (held) strokeRef.current(held, held)
    }

    return () => cancelAnimationFrame(frame)
  }, [])

  const toCell = useCallback(
    (clientX: number, clientY: number): CellPoint | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null

      // The canvas draws with `object-fit: contain`, so the world is centred inside the element and one axis
      // may have a band of nothing either side of it. Mapping straight from the element's box would put the
      // brush off by the width of that band — and where the element is exactly the world's shape, which is
      // every case but full screen, the bands are zero and this is the same sum as before.
      const scale = Math.min(rect.width / GRID_WIDTH, rect.height / GRID_HEIGHT)
      const drawnWidth = GRID_WIDTH * scale
      const drawnHeight = GRID_HEIGHT * scale
      const left = rect.left + (rect.width - drawnWidth) / 2
      const top = rect.top + (rect.height - drawnHeight) / 2

      return {
        x: clamp(Math.floor((clientX - left) / scale), GRID_WIDTH - 1),
        y: clamp(Math.floor((clientY - top) / scale), GRID_HEIGHT - 1),
      }
    },
    [canvasRef]
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const cell = toCell(event.clientX, event.clientY)
      if (!cell) return

      event.currentTarget.setPointerCapture?.(event.pointerId)
      hoverRef.current(cell)
      lastRef.current = cell
      onStroke(cell, cell)
    },
    [toCell, onStroke]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const to = toCell(event.clientX, event.clientY)
      if (!to) return

      // Hover is reported whether or not a button is down, so a readout can follow the pointer while
      // the brush stays free to paint.
      hoverRef.current(to)

      const from = lastRef.current
      if (!from) return

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

  const onPointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      hoverRef.current(null)
      endStroke(event)
    },
    [endStroke]
  )

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endStroke,
      onPointerCancel: endStroke,
      onPointerLeave,
    }),
    [onPointerDown, onPointerMove, endStroke, onPointerLeave]
  )
}
