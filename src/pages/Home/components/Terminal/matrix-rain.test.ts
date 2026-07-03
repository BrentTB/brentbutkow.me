import { describe, it, expect, vi } from 'vitest'
import { createMatrixRain } from './matrix-rain'

// jsdom has no real 2D context; a stub captures the calls the draw step makes.
function mockContext() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    font: '',
  } as unknown as CanvasRenderingContext2D
}

describe('createMatrixRain', () => {
  it('draws one glyph per column each step, over a fade wash', () => {
    const ctx = mockContext()
    // 160 / 16 = 10 columns.
    const rain = createMatrixRain(
      ctx,
      160,
      320,
      () => 'X',
      () => false
    )
    rain.step()
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(10)
  })

  it('tracks the column count when resized', () => {
    const ctx = mockContext()
    const rain = createMatrixRain(
      ctx,
      160,
      320,
      () => 'X',
      () => false
    )
    rain.resize(320, 320)
    rain.step()
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(20)
  })

  it('never divides into zero columns for a zero-width canvas', () => {
    const ctx = mockContext()
    const rain = createMatrixRain(
      ctx,
      0,
      0,
      () => 'X',
      () => false
    )
    expect(() => rain.step()).not.toThrow()
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
  })
})
