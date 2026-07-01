import { describe, it, expect, vi } from 'vitest'
import { buildGridFromSource } from './sample-grid'
import { defaultOptions } from '../data'
import { ColorMode } from '../ascii-art.types'
import { gridCols } from './ascii-frame'

// A 2D context stub: drawImage is a no-op and getImageData hands back a zero
// buffer sized to the request, enough to exercise the sampling math.
const mockCtx = () => {
  const calls = { save: 0, restore: 0, translate: 0, scale: 0 }
  const ctx = {
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(0, w * h * 4)),
    }),
    save: vi.fn(() => calls.save++),
    restore: vi.fn(() => calls.restore++),
    translate: vi.fn(() => calls.translate++),
    scale: vi.fn(() => calls.scale++),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const src = {} as CanvasImageSource
const options = defaultOptions(ColorMode.grayscale) // rows = 64

describe('buildGridFromSource', () => {
  it('returns null when the source has no size yet', () => {
    const { ctx } = mockCtx()
    const sample = document.createElement('canvas')
    expect(buildGridFromSource(sample, ctx, src, 0, 240, options, false)).toBeNull()
    expect(buildGridFromSource(sample, ctx, src, 320, 0, options, false)).toBeNull()
  })

  it('derives cols from the source aspect and sizes the sample canvas', () => {
    const { ctx } = mockCtx()
    const sample = document.createElement('canvas')
    const grid = buildGridFromSource(sample, ctx, src, 320, 240, options, false)
    expect(grid).not.toBeNull()
    expect(grid!.rows).toBe(options.rows)
    expect(grid!.cols).toBe(gridCols(options.rows, 320, 240))
    expect(grid!.cells).toHaveLength(grid!.cols * grid!.rows)
    // sample canvas is downsized to the grid so getImageData reads cells 1:1
    expect(sample.width).toBe(grid!.cols)
    expect(sample.height).toBe(grid!.rows)
  })

  it('mirrors horizontally when flip is set', () => {
    const { ctx, calls } = mockCtx()
    const sample = document.createElement('canvas')
    buildGridFromSource(sample, ctx, src, 320, 240, options, true)
    expect(calls.translate).toBe(1)
    expect(calls.scale).toBe(1)
    expect(calls.save).toBe(1)
    expect(calls.restore).toBe(1)
  })

  it('does not transform when flip is off', () => {
    const { ctx, calls } = mockCtx()
    const sample = document.createElement('canvas')
    buildGridFromSource(sample, ctx, src, 320, 240, options, false)
    expect(calls.save).toBe(0)
    expect(calls.scale).toBe(0)
  })
})
