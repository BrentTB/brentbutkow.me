import type { Vec2 } from '../types'

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Clamps a position into the playfield, optionally inset by `margin`. Shared
// by boss movement (worm cruise/charge) and teleport targeting.
export function clampToWorld(pos: Vec2, worldSize: Vec2, margin = 0): Vec2 {
  return {
    x: clamp(pos.x, margin, worldSize.x - margin),
    y: clamp(pos.y, margin, worldSize.y - margin),
  }
}
