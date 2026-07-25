import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { CellPoint, CellReading, MaterialId, Tool } from './pixel-world.types'
import {
  AMBIENT_TEMPERATURE,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAX_TICKS_PER_FRAME,
  READING_INTERVAL,
  TICK_RATE,
} from './data'
import { MATERIALS } from './engine/materials'
import { Preset } from './engine/presets'
import { writeCellRgb } from './engine/palette'
import { PixelWorldSim, usePixelWorld } from './usePixelWorld'

const MS_PER_TICK = 1000 / TICK_RATE

function blankImage() {
  return {
    data: new Uint8ClampedArray(GRID_WIDTH * GRID_HEIGHT * 4),
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  }
}

/**
 * jsdom has no 2D context. The fake hands back ImageData the renderer keeps rewriting, so reading it
 * back is how a test observes the grid — no test-only accessor on the hook. The renderer asks for two
 * buffers (the world, then the glow layer) and they have to be separate, or the glow pass would punch
 * holes in what the test reads.
 */
function mockCanvasContext() {
  const world = blankImage()
  const glow = blankImage()
  let served = 0

  const context = {
    createImageData: () => (served++ === 0 ? world : glow),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    filter: 'none',
    globalCompositeOperation: 'source-over',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  )
  return world
}

/**
 * Classifies a drawn pixel back to its material by reproducing what the palette would have written for
 * that cell. Jitter is a function of the coordinates, so the match is exact — nearest-colour guessing
 * stopped working once the roster grew and sand and seed ended up neighbours in colour space.
 */
function materialAt(image: { data: Uint8ClampedArray }, x: number, y: number): MaterialId {
  const offset = (y * GRID_WIDTH + x) * 4
  const probe = new Uint8ClampedArray(4)

  for (const material of MATERIALS) {
    writeCellRgb(probe, 0, material.id, 0, x, y)
    if (
      probe[0] === image.data[offset] &&
      probe[1] === image.data[offset + 1] &&
      probe[2] === image.data[offset + 2]
    ) {
      return material.id
    }
  }
  return MaterialId.empty
}

/**
 * How many cells of a material the drawn world holds, within a box. Classifying a pixel means reproducing
 * every material's palette write for that cell, so scanning all ninety thousand of them for each count is
 * slow enough to time a test out; every caller knows roughly where it painted.
 */
function countMaterial(
  image: { data: Uint8ClampedArray },
  material: MaterialId,
  box: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  }
): number {
  let total = 0
  for (let y = box.y; y < Math.min(GRID_HEIGHT, box.y + box.height); y++) {
    for (let x = box.x; x < Math.min(GRID_WIDTH, box.x + box.width); x++) {
      if (materialAt(image, x, y) === material) total++
    }
  }
  return total
}

/** Row of the single sand grain in a column, or null when the column holds none. */
function sandRow(image: { data: Uint8ClampedArray }, x: number): number | null {
  for (let y = 0; y < GRID_HEIGHT; y++) {
    if (materialAt(image, x, y) === MaterialId.sand) return y
  }
  return null
}

let nextFrame: FrameRequestCallback | null = null
let lastHandle = 0
let cancelledHandles: number[] = []
let clock = 0

function frame(deltaMs: number) {
  clock += deltaMs
  const callback = nextFrame
  nextFrame = null
  act(() => callback?.(clock))
}

beforeEach(() => {
  nextFrame = null
  lastHandle = 0
  cancelledHandles = []
  clock = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextFrame = callback
    return ++lastHandle
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    cancelledHandles.push(handle)
    nextFrame = null
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Watches a cell and hands back the reading the hook publishes for it. */
function readingFor(result: { current: PixelWorldSim }, cell: CellPoint): CellReading {
  // Watching afresh reads straight away; the interval only takes over once a cell is already followed.
  act(() => result.current.watch(null))
  act(() => result.current.watch(cell))

  const reading = result.current.reading
  if (reading === null) throw new Error(`no reading for ${cell.x},${cell.y}`)
  return reading
}

function mountSim() {
  const image = mockCanvasContext()
  const canvas = document.createElement('canvas')
  const canvasRef = { current: canvas }
  const rendered = renderHook(() => usePixelWorld(canvasRef))
  return { ...rendered, image }
}

describe('usePixelWorld', () => {
  it('steps the world while running', () => {
    const { result, image } = mountSim()
    act(() => result.current.paintStroke({ x: 10, y: 10 }, { x: 10, y: 10 }, MaterialId.sand, 0))

    frame(0)
    expect(sandRow(image, 10)).toBe(10)

    for (let i = 0; i < 5; i++) frame(MS_PER_TICK)
    expect(sandRow(image, 10)).toBe(15)
  })

  it('runs the heat pass too, not just movement', () => {
    const { result, image } = mountSim()
    // Lava sitting on an ice slab: only the temperature pass can melt any of this.
    act(() => {
      result.current.paintStroke(
        { x: 100, y: GRID_HEIGHT - 4 },
        { x: 200, y: GRID_HEIGHT - 4 },
        MaterialId.ice,
        3
      )
      result.current.paintStroke(
        { x: 150, y: GRID_HEIGHT - 12 },
        { x: 150, y: GRID_HEIGHT - 12 },
        MaterialId.lava,
        3
      )
    })
    frame(0)
    const slab = { x: 140, y: GRID_HEIGHT - 20, width: 80, height: 20 }
    const iceBefore = countMaterial(image, MaterialId.ice, slab)

    // Soaked with Step rather than 300 animation frames: same tick, without redrawing the whole world
    // each time. That the loop ticks at all is what 'steps the world while running' is for.
    act(() => {
      for (let i = 0; i < 300; i++) result.current.stepOnce()
    })
    frame(MS_PER_TICK)

    expect(iceBefore).toBeGreaterThan(0)
    expect(countMaterial(image, MaterialId.ice, slab)).toBeLessThan(iceBefore)
  })

  it('runs the reaction pass too', () => {
    const { result, image } = mountSim()
    act(() => {
      result.current.paintStroke({ x: 120, y: 150 }, { x: 120, y: 150 }, MaterialId.sand, 8)
      result.current.paintStroke({ x: 120, y: 138 }, { x: 120, y: 138 }, MaterialId.acid, 2)
    })
    frame(0)
    const heap = { x: 100, y: 130, width: 45, height: 40 }
    const sandBefore = countMaterial(image, MaterialId.sand, heap)

    act(() => {
      for (let i = 0; i < 400; i++) result.current.stepOnce()
    })
    frame(MS_PER_TICK)

    // Nothing but the acid reaction removes sand — movement and heat leave it alone.
    expect(sandBefore).toBeGreaterThan(0)
    expect(countMaterial(image, MaterialId.sand, heap)).toBeLessThan(sandBefore)
  })

  it('holds the world still while paused, and paints into it anyway', () => {
    const { result, image } = mountSim()
    act(() => result.current.togglePause())
    expect(result.current.isPaused).toBe(true)

    act(() => result.current.paintStroke({ x: 20, y: 4 }, { x: 20, y: 4 }, MaterialId.sand, 0))
    for (let i = 0; i < 10; i++) frame(MS_PER_TICK)

    expect(sandRow(image, 20)).toBe(4)
  })

  it('advances exactly one tick per Step', () => {
    const { result, image } = mountSim()
    act(() => result.current.togglePause())
    act(() => result.current.paintStroke({ x: 30, y: 7 }, { x: 30, y: 7 }, MaterialId.sand, 0))

    act(() => result.current.stepOnce())
    frame(MS_PER_TICK)

    expect(sandRow(image, 30)).toBe(8)
  })

  it('runs fewer ticks per second in slow motion and more at speed', () => {
    const fallenAfterASecond = (rate: number) => {
      const { result, image } = mountSim()
      act(() => result.current.setSpeed(rate))
      act(() => result.current.paintStroke({ x: 60, y: 2 }, { x: 60, y: 2 }, MaterialId.sand, 0))

      frame(0)
      // A second of frames at 60 Hz.
      for (let i = 0; i < 60; i++) frame(MS_PER_TICK)
      const row = sandRow(image, 60)
      cleanup()
      return row ?? 0
    }

    const slow = fallenAfterASecond(0.25)
    const normal = fallenAfterASecond(1)
    const fast = fallenAfterASecond(4)

    expect(slow).toBeLessThan(normal)
    expect(fast).toBeGreaterThan(normal)
  })

  it('caps catch-up work after a long stall', () => {
    const { result, image } = mountSim()
    act(() => result.current.paintStroke({ x: 40, y: 2 }, { x: 40, y: 2 }, MaterialId.sand, 0))

    frame(0)
    frame(10_000)

    expect(sandRow(image, 40)).toBe(2 + MAX_TICKS_PER_FRAME)
  })

  it('clears the world', () => {
    const { result, image } = mountSim()
    act(() => result.current.paintStroke({ x: 50, y: 5 }, { x: 60, y: 5 }, MaterialId.stone, 3))
    frame(0)
    expect(materialAt(image, 55, 5)).toBe(MaterialId.stone)

    act(() => result.current.clear())
    frame(MS_PER_TICK)

    expect(materialAt(image, 55, 5)).toBe(MaterialId.empty)
  })

  it('reads back what is in a cell', () => {
    const { result } = mountSim()
    act(() => result.current.paintStroke({ x: 12, y: 8 }, { x: 12, y: 8 }, MaterialId.lava, 0))

    const reading = readingFor(result, { x: 12, y: 8 })

    expect(reading.material).toBe(MaterialId.lava)
    expect(reading.temperature).toBe(MATERIALS[MaterialId.lava].startTemperature)
    expect(reading.burning).toBe(false)
  })

  it('reads empty space as empty, at room temperature', () => {
    const { result } = mountSim()

    const reading = readingFor(result, { x: 3, y: 3 })

    expect(reading.material).toBe(MaterialId.empty)
    expect(reading.temperature).toBe(AMBIENT_TEMPERATURE)
  })

  it('reads a cell that is alight as burning', () => {
    const { result } = mountSim()
    act(() => result.current.paintStroke({ x: 20, y: 9 }, { x: 20, y: 9 }, MaterialId.wood, 0))
    act(() => result.current.paintStroke({ x: 20, y: 9 }, { x: 20, y: 9 }, MaterialId.fire, 0))

    const reading = readingFor(result, { x: 20, y: 9 })

    // The fire brush lights fuel rather than replacing it, so this stays wood — and says so.
    expect(reading.material).toBe(MaterialId.wood)
    expect(reading.burning).toBe(true)
  })

  it('follows a watched cell as the world changes, with no further clicks', () => {
    const { result } = mountSim()
    act(() => result.current.paintStroke({ x: 40, y: 4 }, { x: 40, y: 4 }, MaterialId.lava, 0))
    act(() => result.current.watch({ x: 40, y: 4 }))

    expect(result.current.reading?.material).toBe(MaterialId.lava)

    // The lava falls away on its own; the reading follows the cell, not the material.
    for (let i = 0; i < 40; i++) frame(MS_PER_TICK)
    act(() => frame(READING_INTERVAL + MS_PER_TICK))

    expect(result.current.reading?.material).not.toBe(MaterialId.lava)
  })

  it('says what a source has been fed', () => {
    const { result } = mountSim()
    act(() => result.current.paintStroke({ x: 30, y: 20 }, { x: 30, y: 20 }, MaterialId.source, 0))

    const unfed = readingFor(result, { x: 30, y: 20 })
    expect(unfed.material).toBe(MaterialId.source)
    // The one thing about a source you cannot see by looking at it.
    expect(unfed.producing).toBeUndefined()

    act(() => result.current.paintStroke({ x: 30, y: 21 }, { x: 30, y: 21 }, MaterialId.lava, 0))
    for (let i = 0; i < 10; i++) frame(MS_PER_TICK)

    expect(readingFor(result, { x: 30, y: 20 }).producing).toBe(MaterialId.lava)
  })

  it('leaves `producing` off anything that is not a source', () => {
    const { result } = mountSim()
    act(() => result.current.paintStroke({ x: 44, y: 6 }, { x: 44, y: 6 }, MaterialId.acid, 0))

    // Acid keeps its charge count in the same byte, which must not read as a product.
    expect(readingFor(result, { x: 44, y: 6 }).producing).toBeUndefined()
  })

  it('leaves a moving pointer to the refresh interval instead of reading on every cell', () => {
    const { result } = mountSim()
    act(() => result.current.paintStroke({ x: 12, y: 30 }, { x: 12, y: 30 }, MaterialId.stone, 0))
    act(() => result.current.watch({ x: 70, y: 30 }))
    expect(result.current.reading?.material).toBe(MaterialId.empty)

    // Sweeping onto the stone mid-drag must not itself set state: reading on every pointer event
    // re-rendered the page a hundred times a second.
    act(() => result.current.watch({ x: 12, y: 30 }))
    expect(result.current.reading?.material).toBe(MaterialId.empty)

    act(() => frame(READING_INTERVAL + MS_PER_TICK))
    expect(result.current.reading?.material).toBe(MaterialId.stone)
  })

  it('stops following when asked', () => {
    const { result } = mountSim()
    act(() => result.current.watch({ x: 10, y: 10 }))
    expect(result.current.reading).not.toBeNull()

    act(() => result.current.watch(null))

    expect(result.current.reading).toBeNull()
  })

  it('warms and cools the world with the heat and chill tools', () => {
    const { result } = mountSim()
    const cell = { x: 80, y: 60 }
    act(() => result.current.paintStroke(cell, cell, MaterialId.stone, 2))

    act(() => result.current.applyForce(Tool.heat, cell, cell, 4))
    const warmed = readingFor(result, cell).temperature

    act(() => result.current.applyForce(Tool.chill, cell, cell, 4))
    act(() => result.current.applyForce(Tool.chill, cell, cell, 4))

    expect(warmed).toBeGreaterThan(AMBIENT_TEMPERATURE)
    expect(readingFor(result, cell).temperature).toBeLessThan(AMBIENT_TEMPERATURE)
  })

  it('throws material upward with the blast tool', () => {
    const { result, image } = mountSim()
    const cell = { x: 90, y: 120 }
    act(() => result.current.paintStroke(cell, cell, MaterialId.sand, 0))
    frame(0)

    act(() => result.current.applyForce(Tool.blast, cell, cell, 6))
    for (let i = 0; i < 4; i++) frame(MS_PER_TICK)

    // Sand alone would have fallen four rows by now; a blast under it sends it the other way.
    const row = sandRow(image, 90)
    expect(row).not.toBeNull()
    expect(row ?? 0).toBeLessThan(cell.y)
  })

  it('blows material sideways with the wind tool, along the drag', () => {
    const { result, image } = mountSim()
    const start = { x: 150, y: 100 }
    act(() => result.current.paintStroke(start, start, MaterialId.sand, 0))
    frame(0)

    // A drag to the right, one pointer sample at a time — which is how the events actually arrive.
    for (let gust = 0; gust < 3; gust++) {
      act(() =>
        result.current.applyForce(Tool.wind, start, { x: start.x + 1, y: start.y + gust }, 6)
      )
    }
    for (let i = 0; i < 6; i++) frame(MS_PER_TICK)

    expect(sandRow(image, start.x)).toBeNull()
    expect(
      countMaterial(image, MaterialId.sand, { x: start.x, y: 60, width: 60, height: 80 })
    ).toBe(1)
  })

  it('drops a whole world in on request', () => {
    const { result, image } = mountSim()
    act(() => result.current.paintStroke({ x: 5, y: 5 }, { x: 5, y: 5 }, MaterialId.lava, 0))
    frame(0)

    act(() => result.current.load(Preset.aquarium))
    frame(0)

    const tank = { x: 0, y: 0, width: GRID_WIDTH, height: 40 }
    expect(countMaterial(image, MaterialId.lava, tank)).toBe(0)
    expect(
      countMaterial(image, MaterialId.water, { x: 0, y: 60, width: 120, height: 60 })
    ).toBeGreaterThan(100)
  })

  it('stops the loop on unmount', () => {
    const { unmount } = mountSim()
    frame(MS_PER_TICK)

    unmount()

    expect(cancelledHandles).toContain(lastHandle)
  })
})
