import { describe, it, expect, vi } from 'vitest'
import { drawSlingAim } from './sling-aim'
import type { Camera } from './camera'
import { createShip } from '../engine/entities/entity-creator'
import { ShipKind } from '../engine/types'
import { WORLD_SIZE } from '../data'

const camera: Camera = { x: 0, y: 0, width: 800, height: 600, zoom: 1, dpr: 2 }

function mockCtx() {
  // Capture moveTo coords — the first is the arrow's origin (the ship), which a
  // test asserts stays on-screen across a world seam.
  const moves: Array<{ x: number; y: number }> = []
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => moves.push({ x, y })),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    moves,
  }
}

describe('drawSlingAim', () => {
  // Regression: the arrow must pin its own DPR baseline BEFORE drawing, so a leaked
  // transform can't survive into the path. A fresh ship isn't blocked, so a real drag draws.
  it('pins the DPR-baseline transform before the first path op', () => {
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
    expect(ctx.setTransform.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.beginPath.mock.invocationCallOrder[0]
    )
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

  // Regression: the arrow origin must follow the ship across a world seam. The ship
  // sits just over the left border while the camera trails near the right border, so
  // raw (pos − camera.x) maths lands a full world off-screen; worldToScreen keeps it
  // on the ship's nearest image, on-screen.
  it('keeps the arrow on-screen when the ship is across the world seam', () => {
    const ctx = mockCtx()
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 10, y: 300 } }
    const seamCamera: Camera = { ...camera, x: WORLD_SIZE.x - 200, y: 0 }
    drawSlingAim(
      ctx as unknown as CanvasRenderingContext2D,
      ship,
      seamCamera,
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      100
    )
    expect(ctx.stroke).toHaveBeenCalled()
    const origin = ctx.moves[0]
    expect(origin.x).toBeGreaterThanOrEqual(0)
    expect(origin.x).toBeLessThanOrEqual(seamCamera.width)
    expect(origin.y).toBeGreaterThanOrEqual(0)
    expect(origin.y).toBeLessThanOrEqual(seamCamera.height)
  })
})
