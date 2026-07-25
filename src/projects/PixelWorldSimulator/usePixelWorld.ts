import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CellPoint, Grid, MaterialId } from './pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH, MAX_TICKS_PER_FRAME, TICK_RATE } from './data'
import { stampLine } from './engine/brush'
import { clearGrid, createGrid } from './engine/grid'
import { Rng, createRng } from './engine/rng'
import { step } from './engine/step'
import { createRenderer } from './render'

export type PixelWorldSim = {
  isPaused: boolean
  togglePause(): void
  /** Advances exactly one tick — the whole automaton becomes legible when you can watch it crawl. */
  stepOnce(): void
  clear(): void
  paintStroke(from: CellPoint, to: CellPoint, material: MaterialId, radius: number): void
}

/**
 * Owns the grid and the animation loop. Simulation runs on a fixed 60 Hz accumulator (a cellular
 * automaton has no fractional steps), while drawing runs every frame — so a paused world still
 * repaints as you draw into it.
 */
export function usePixelWorld(canvasRef: RefObject<HTMLCanvasElement | null>): PixelWorldSim {
  const gridRef = useRef<Grid>(createGrid(GRID_WIDTH, GRID_HEIGHT))
  const rngRef = useRef<Rng | null>(null)
  if (rngRef.current === null) rngRef.current = createRng(Date.now())
  const rng = rngRef.current

  const tickRef = useRef(0)
  const pausedRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = createRenderer(canvas, GRID_WIDTH, GRID_HEIGHT)
    const msPerTick = 1000 / TICK_RATE
    let frame = requestAnimationFrame(loop)
    let previous: number | null = null
    let accumulator = 0

    function loop(time: number) {
      frame = requestAnimationFrame(loop)

      const elapsed = previous === null ? 0 : time - previous
      previous = time

      if (!pausedRef.current) {
        accumulator += elapsed
        let ticks = 0
        while (accumulator >= msPerTick && ticks < MAX_TICKS_PER_FRAME) {
          accumulator -= msPerTick
          ticks++
          step(gridRef.current, rng, tickRef.current++)
        }
        // Whatever the frame budget couldn't cover is dropped, not owed — a backgrounded tab
        // shouldn't come back and fast-forward the world.
        if (accumulator > msPerTick) accumulator = 0
      }

      renderer.draw(gridRef.current)
    }

    return () => cancelAnimationFrame(frame)
  }, [canvasRef, rng])

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current
    setIsPaused(pausedRef.current)
  }, [])

  const stepOnce = useCallback(() => {
    step(gridRef.current, rng, tickRef.current++)
  }, [rng])

  const clear = useCallback(() => {
    clearGrid(gridRef.current)
  }, [])

  const paintStroke = useCallback(
    (from: CellPoint, to: CellPoint, material: MaterialId, radius: number) => {
      stampLine(gridRef.current, from.x, from.y, to.x, to.y, radius, material)
    },
    []
  )

  return useMemo(
    () => ({ isPaused, togglePause, stepOnce, clear, paintStroke }),
    [isPaused, togglePause, stepOnce, clear, paintStroke]
  )
}
