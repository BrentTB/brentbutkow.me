import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { MaterialId } from './pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH, MAX_TICKS_PER_FRAME, TICK_RATE } from './data'
import { MATERIALS } from './engine/materials'
import { usePixelWorld } from './usePixelWorld'

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

/** Classifies a drawn pixel back to its material by nearest palette colour. */
function materialAt(image: { data: Uint8ClampedArray }, x: number, y: number): MaterialId {
  const offset = (y * GRID_WIDTH + x) * 4
  let best: MaterialId = MaterialId.empty
  let bestDistance = Infinity

  for (const material of MATERIALS) {
    const distance = material.color.reduce(
      (total, channel, i) => total + Math.abs(channel - image.data[offset + i]),
      0
    )
    if (distance < bestDistance) {
      bestDistance = distance
      best = material.id
    }
  }
  return best
}

/** How many cells of a material the drawn world holds. */
function countMaterial(image: { data: Uint8ClampedArray }, material: MaterialId): number {
  let total = 0
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
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
    const iceBefore = countMaterial(image, MaterialId.ice)

    for (let i = 0; i < 300; i++) frame(MS_PER_TICK)

    expect(iceBefore).toBeGreaterThan(0)
    expect(countMaterial(image, MaterialId.ice)).toBeLessThan(iceBefore)
  })

  it('runs the reaction pass too', () => {
    const { result, image } = mountSim()
    act(() => {
      result.current.paintStroke({ x: 120, y: 150 }, { x: 120, y: 150 }, MaterialId.sand, 8)
      result.current.paintStroke({ x: 120, y: 138 }, { x: 120, y: 138 }, MaterialId.acid, 2)
    })
    frame(0)
    const sandBefore = countMaterial(image, MaterialId.sand)

    for (let i = 0; i < 400; i++) frame(MS_PER_TICK)

    // Nothing but the acid reaction removes sand — movement and heat leave it alone.
    expect(sandBefore).toBeGreaterThan(0)
    expect(countMaterial(image, MaterialId.sand)).toBeLessThan(sandBefore)
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

  it('stops the loop on unmount', () => {
    const { unmount } = mountSim()
    frame(MS_PER_TICK)

    unmount()

    expect(cancelledHandles).toContain(lastHandle)
  })
})
