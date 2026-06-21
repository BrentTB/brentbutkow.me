import { describe, it, expect, vi } from 'vitest'
import { drawSlingAim } from './sling-aim'
import type { Camera } from './camera'
import { createShip } from '../engine/entities/entity-creator'
import { ShipKind } from '../engine/types'
import { WORLD_SIZE } from '../data'

const camera: Camera = { x: 0, y: 0, width: 800, height: 600, zoom: 1, dpr: 2 }

function mockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
  }
}

describe('drawSlingAim', () => {
  // Regression: the arrow must pin its own DPR baseline. A fresh ship isn't blocked,
  // so a real drag should draw — and reset the transform first, immune to any leak.
  it('sets its own DPR-baseline transform before drawing', () => {
    const ctx = mockCtx()
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    drawSlingAim(
      ctx as unknown as CanvasRenderingContext2D,
      ship,
      camera,
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      100
    )
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('draws nothing for a negligible drag', () => {
    const ctx = mockCtx()
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    drawSlingAim(
      ctx as unknown as CanvasRenderingContext2D,
      ship,
      camera,
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      100
    )
    expect(ctx.stroke).not.toHaveBeenCalled()
  })
})
