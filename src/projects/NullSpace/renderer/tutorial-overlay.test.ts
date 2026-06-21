import { describe, it, expect, vi } from 'vitest'
import { drawTutorialFocus } from './tutorial-overlay'
import type { Camera } from './camera'

const camera: Camera = { x: 0, y: 0, width: 800, height: 600, zoom: 1, dpr: 2 }
const opts = { reducedMotion: true, pulseClock: 0 }

function mockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  }
}

describe('drawTutorialFocus', () => {
  // Regression: the spotlight must pin its own DPR baseline BEFORE drawing, so a leaked
  // transform can't push it off-screen.
  it('pins the DPR-baseline transform before the first draw op', () => {
    const ctx = mockCtx()
    drawTutorialFocus(
      ctx as unknown as CanvasRenderingContext2D,
      camera,
      { x: 1000, y: 1000 },
      opts
    )
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(ctx.setTransform.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.fillRect.mock.invocationCallOrder[0]
    )
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('draws nothing without a focus target', () => {
    const ctx = mockCtx()
    drawTutorialFocus(ctx as unknown as CanvasRenderingContext2D, camera, null, opts)
    expect(ctx.save).not.toHaveBeenCalled()
    expect(ctx.setTransform).not.toHaveBeenCalled()
  })
})
