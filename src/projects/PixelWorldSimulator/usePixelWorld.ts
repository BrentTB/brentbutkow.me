import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CellPoint, CellReading, Grid, MaterialId, SimSettings, Tool } from './pixel-world.types'
import {
  CENSUS_INTERVAL,
  DEFAULT_SETTINGS,
  DEFAULT_SPEED,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAX_TICKS_PER_FRAME,
  READING_INTERVAL,
  TICK_RATE,
} from './data'
import { stampLine } from './engine/brush'
import { countMaterials } from './engine/census'
import { MATERIALS } from './engine/materials'
import { Preset, loadPreset } from './engine/presets'
import { blast, temper } from './engine/forces'
import { asMaterial, cellIndex, clearGrid, createGrid } from './engine/grid'
import { Rng, createRng } from './engine/rng'
import { tickWorld } from './engine/tick'
import { Snapshot, SnapshotResult, decodeSnapshot, encodeSnapshot } from './engine/snapshot'
import { createRenderer } from './render'

export type PixelWorldSim = {
  isPaused: boolean
  togglePause(): void
  /** Stops the world whatever it was doing. A world arriving paused from a link cannot flip a coin about it. */
  pause(): void
  /** Multiplier on how fast the world runs. 1 is real time. */
  speed: number
  setSpeed(rate: number): void
  /** Advances exactly one tick — the whole automaton becomes legible when you can watch it crawl. */
  stepOnce(): void
  clear(): void
  /** Wipes the world and builds a ready-made one, for trying something without drawing it first. */
  load(preset: Preset): void
  paintStroke(from: CellPoint, to: CellPoint, material: MaterialId, radius: number): void
  /**
   * Runs a force tool over the world. Takes both ends of the drag because wind blows the way you
   * dragged; everything else only cares where the pointer ended up.
   */
  applyForce(tool: Tool, to: CellPoint, radius: number): void
  /**
   * Follow a cell: `reading` then refreshes on its own while the world runs, so a temperature can be
   * watched changing without clicking. Pass null to stop.
   */
  watch(cell: CellPoint | null): void
  reading: CellReading | null
  /**
   * Turn the running tally of what the world is made of on or off. Off by default and while the panel that
   * shows it is collapsed: counting every cell is a whole pass over the grid, and there is no reason to pay
   * for it when nobody is reading the numbers.
   */
  watchCensus(on: boolean): void
  /** Cells of each material, indexed by `MaterialId`, or null while the tally is switched off. */
  census: Uint32Array | null
  /**
   * Hands over the viewer's settings. The picture ones take effect on the next frame drawn; `airCurrents`
   * also decides whether the air pass runs at all, so it reaches the sim through the same ref.
   */
  applySettings(settings: SimSettings): void
  /** The world as a string for a link, and whether its heat had to be left out to fit. */
  snapshot(): Promise<Snapshot>
  /** Replaces the world with one from a link, or refuses it and leaves this one alone. */
  loadSnapshot(code: string): Promise<SnapshotResult>
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

  // The tally is written into one array for the life of the world and handed out as a fresh copy, so React
  // sees a new value to render while the counting itself allocates nothing.
  const censusRef = useRef(new Uint32Array(MATERIALS.length))
  const censusOnRef = useRef(false)
  const [census, setCensus] = useState<Uint32Array | null>(null)

  // The renderer reads this every frame, so toggling a setting repaints without rebuilding the loop.
  const settingsRef = useRef<SimSettings>({ ...DEFAULT_SETTINGS })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = createRenderer(canvas, GRID_WIDTH, GRID_HEIGHT, () => settingsRef.current)
    const msPerTick = 1000 / TICK_RATE
    let frame = requestAnimationFrame(loop)
    let previous: number | null = null
    let accumulator = 0
    let lastReading = 0
    let lastCensus = 0

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
          tickWorld(gridRef.current, rng, tickRef.current++, settingsRef.current.airCurrents)
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

      if (censusOnRef.current && time - lastCensus >= CENSUS_INTERVAL) {
        lastCensus = time
        setCensus(countMaterials(gridRef.current, censusRef.current).slice())
      }
    }

    return () => cancelAnimationFrame(frame)
  }, [canvasRef, rng])

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current
    setIsPaused(pausedRef.current)
  }, [])

  const pause = useCallback(() => {
    pausedRef.current = true
    setIsPaused(true)
  }, [])

  const setSpeed = useCallback((rate: number) => {
    speedRef.current = rate
    setSpeedState(rate)
  }, [])

  const stepOnce = useCallback(() => {
    tickWorld(gridRef.current, rng, tickRef.current++, settingsRef.current.airCurrents)
  }, [rng])

  const clear = useCallback(() => {
    clearGrid(gridRef.current)
  }, [])

  const load = useCallback(
    (preset: Preset) => {
      loadPreset(gridRef.current, preset, rng)
    },
    [rng]
  )

  const paintStroke = useCallback(
    (from: CellPoint, to: CellPoint, material: MaterialId, radius: number) => {
      stampLine(gridRef.current, from.x, from.y, to.x, to.y, radius, material)
    },
    []
  )

  // No `from`: wind was the only force that cared which way the pointer was travelling, and the rest act on
  // the disc under it.
  const applyForce = useCallback((tool: Tool, to: CellPoint, radius: number) => {
    const grid = gridRef.current
    // A force needs somewhere to reach even at the smallest brush, where the paint radius is 0.
    const reach = Math.max(4, radius)

    if (tool === Tool.blast) blast(grid, to.x, to.y, reach)
    else if (tool === Tool.heat) temper(grid, to.x, to.y, reach, true)
    else if (tool === Tool.chill) temper(grid, to.x, to.y, reach, false)
  }, [])

  const watch = useCallback((cell: CellPoint | null) => {
    const wasWatching = watchedRef.current !== null
    watchedRef.current = cell
    // The loop refreshes a watched cell on its own interval, so only the first cell reads straight
    // away. Reading on every move instead re-rendered the page once per pointer event.
    if (cell === null) setReading(null)
    else if (!wasWatching) setReading(readCell(gridRef.current, cell))
  }, [])

  const snapshot = useCallback(
    () => encodeSnapshot(gridRef.current, settingsRef.current.airCurrents),
    []
  )

  const loadSnapshot = useCallback((code: string) => decodeSnapshot(code, gridRef.current), [])

  const applySettings = useCallback((settings: SimSettings) => {
    const wasOn = settingsRef.current.airCurrents
    settingsRef.current = settings
    // Switching air off stops the pass, which would otherwise leave the field frozen mid-gust: the next time
    // it came back on, a draught nobody raised would still be blowing.
    if (wasOn && !settings.airCurrents) {
      gridRef.current.airX.fill(0)
      gridRef.current.airY.fill(0)
      gridRef.current.airXNext.fill(0)
      gridRef.current.airYNext.fill(0)
    }
  }, [])

  const watchCensus = useCallback((on: boolean) => {
    censusOnRef.current = on
    // Switching on reads straight away, so the numbers are there the moment the panel opens rather than
    // after the next refresh; switching off drops them so nothing stale is left on screen.
    if (on) setCensus(countMaterials(gridRef.current, censusRef.current).slice())
    else setCensus(null)
  }, [])

  return useMemo(
    () => ({
      isPaused,
      togglePause,
      pause,
      speed,
      setSpeed,
      stepOnce,
      clear,
      load,
      paintStroke,
      applyForce,
      watch,
      reading,
      watchCensus,
      census,
      applySettings,
      snapshot,
      loadSnapshot,
    }),
    [
      isPaused,
      togglePause,
      pause,
      speed,
      setSpeed,
      stepOnce,
      clear,
      load,
      paintStroke,
      applyForce,
      watch,
      reading,
      watchCensus,
      census,
      applySettings,
      snapshot,
      loadSnapshot,
    ]
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
