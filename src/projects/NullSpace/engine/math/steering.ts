import type { Vec2 } from '../types'

// Cruise along unit `dir` at `speed`, plus a sinusoidal lateral weave
// perpendicular to `dir` (so the path bends gently instead of running dead
// straight). `weave.amplitude` is the peak lateral speed; `weave.phase` is the
// accumulated weave phase in cycles. Returns the new position and the velocity
// used so callers can store `vel` for facing/render. Pure — inputs untouched.
export function driftWithWeave(
  pos: Vec2,
  dir: Vec2,
  speed: number,
  weave: { amplitude: number; phase: number },
  dt: number
): { pos: Vec2; vel: Vec2 } {
  // Perpendicular to `dir` (rotated +90°): for dir={0,1} this is the X axis.
  const perpX = -dir.y
  const perpY = dir.x
  const lateral = weave.amplitude * Math.cos(weave.phase * Math.PI * 2)
  const velX = dir.x * speed + perpX * lateral
  const velY = dir.y * speed + perpY * lateral
  return {
    pos: { x: pos.x + velX * dt, y: pos.y + velY * dt },
    vel: { x: velX, y: velY },
  }
}
