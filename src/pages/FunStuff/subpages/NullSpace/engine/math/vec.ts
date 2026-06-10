import type { Vec2 } from '../types'

// Unit vector from `from` to `to`. Falls back to +x for coincident points so
// callers always get a usable direction.
export function unitToward(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 0.0001) return { x: 1, y: 0 }
  return { x: dx / d, y: dy / d }
}
