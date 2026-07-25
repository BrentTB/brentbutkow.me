import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CellPoint, CellReading, Grid, MaterialId } from './pixel-world.types'
import {
  DEFAULT_SPEED,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAX_TICKS_PER_FRAME,
  READING_INTERVAL,
  TICK_RATE,
} from './data'
import { stampLine } from './engine/brush'
import { asMaterial, cellIndex, clearGrid, createGrid } from './engine/grid'
import { Rng, createRng } from './engine/rng'
import { tickWorld } from './engine/tick'
import { createRenderer } from './render'

export type PixelWorldSim = {
  isPaused: boolean
  togglePause(): void
  /** Multiplier on how fast the world runs. 1 is real time. */
  speed: number
  setSpeed(rate: number): void
  /** Advances exactly one tick — the whole automaton becomes legible when you can watch it crawl. */
  stepOnce(): void
  clear(): void
  paintStroke(from: CellPoint, to: CellPoint, material: MaterialId, radius: number): void
  /**
   * Follow a cell: `reading` then refreshes on its own while the world runs, so a temperature can be
   * watched changing without clicking. Pass null to stop.
   */
  watch(cell: CellPoint | null): void
  reading: CellReading | null
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
  // The loop reads the rate from a ref so changing speed doesn't tear down the animation frame.
  const speedRef = useRef(DEFAULT_SPEED)
  const [speed, setSpeedState] = useState(DEFAULT_SPEED)

  const watchedRef = useRef<CellPoint | null>(null)
  const [reading, setReading] = useState<CellReading | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = createRenderer(canvas, GRID_WIDTH, GRID_HEIGHT)
    const msPerTick = 1000 / TICK_RATE
    let frame = requestAnimationFrame(loop)
    let previous: number | null = null
    let accumulator = 0
    let lastReading = 0

    function loop(time: number) {
      frame = requestAnimationFrame(loop)

      const elapsed = previous === null ? 0 : time - previous
      previous = time

      if (!pausedRef.current) {
        const rate = speedRef.current
        // Speed shortens the tick, so slow motion runs fewer ticks per second and fast runs more, and
        // the catch-up cap scales with it — otherwise a faster speed is clamped back to real time.
        const step = msPerTick / rate
        const budget = Math.ceil(MAX_TICKS_PER_FRAME * rate)

        accumulator += elapsed
        let ticks = 0
        while (accumulator >= step && ticks < budget) {
          accumulator -= step
          ticks++
          tickWorld(gridRef.current, rng, tickRef.current++)
        }
        // Whatever the frame budget couldn't cover is dropped, not owed — a backgrounded tab
        // shouldn't come back and fast-forward the world.
        if (accumulator > step) accumulator = 0
      }

      renderer.draw(gridRef.current)

      const watched = watchedRef.current
      if (watched !== null && time - lastReading >= READING_INTERVAL) {
        lastReading = time
        setReading(readCell(gridRef.current, watched))
      }
    }

    return () => cancelAnimationFrame(frame)
  }, [canvasRef, rng])

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current
    setIsPaused(pausedRef.current)
  }, [])

  const setSpeed = useCallback((rate: number) => {
    speedRef.current = rate
    setSpeedState(rate)
  }, [])

  const stepOnce = useCallback(() => {
    tickWorld(gridRef.current, rng, tickRef.current++)
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

  const watch = useCallback((cell: CellPoint | null) => {
    const wasWatching = watchedRef.current !== null
    watchedRef.current = cell
    // The loop refreshes a watched cell on its own interval, so only the first cell reads straight
    // away. Reading on every move instead re-rendered the page once per pointer event.
    if (cell === null) setReading(null)
    else if (!wasWatching) setReading(readCell(gridRef.current, cell))
  }, [])

  return useMemo(
    () => ({
      isPaused,
      togglePause,
      speed,
      setSpeed,
      stepOnce,
      clear,
      paintStroke,
      watch,
      reading,
    }),
    [isPaused, togglePause, speed, setSpeed, stepOnce, clear, paintStroke, watch, reading]
  )
}

function readCell(grid: Grid, cell: CellPoint): CellReading {
  const index = cellIndex(grid, cell.x, cell.y)
  const material = asMaterial(grid.material[index])

  // A source keeps the id of whatever it was first fed in its `data` byte, and that is the one thing
  // about it you cannot see by looking.
  const fed = grid.data[index]
  const producing =
    material === MaterialId.source && fed !== MaterialId.empty ? asMaterial(fed) : undefined

  return {
    material,
    temperature: grid.temperature[index],
    burning: grid.burn[index] > 0,
    producing,
  }
}
