import type { Vec2 } from '../types'

// `count` evenly-spaced points on a circle, starting at `startAngle`. Shared
// by ring formations: generator/swarm spawn rings, the Meteor Shower ring.
export function ringPositions(center: Vec2, radius: number, count: number, startAngle = 0): Vec2[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + (i * 2 * Math.PI) / count
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
  })
}

// Unit vector from `from` to `to`. Falls back to +x for coincident points so
// callers always get a usable direction.
export function unitToward(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 0.0001) return { x: 1, y: 0 }
  return { x: dx / d, y: dy / d }
}
