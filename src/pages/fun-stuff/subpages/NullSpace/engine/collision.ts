import type { Entity, Vec2 } from './types'

export function checkCollision(a: Entity, b: Entity): boolean {
  const dx = a.pos.x - b.pos.x
  const dy = a.pos.y - b.pos.y
  const distSq = dx * dx + dy * dy
  const radii = a.radius + b.radius
  return distSq < radii * radii
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Swept circle test: returns true if the segment p1→p2 passes within `radius`
// of `center`. Catches fast-moving projectiles that would tunnel through a
// thin enemy in a single frame.
export function segmentIntersectsCircle(p1: Vec2, p2: Vec2, center: Vec2, radius: number): boolean {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const fx = p1.x - center.x
  const fy = p1.y - center.y

  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius

  // Degenerate segment (zero length) — fall back to point-in-circle
  if (a === 0) return c < 0

  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return false

  const sqrtD = Math.sqrt(discriminant)
  const t1 = (-b - sqrtD) / (2 * a)
  const t2 = (-b + sqrtD) / (2 * a)

  // Intersection exists if either root lies within [0, 1], or the segment
  // starts inside the circle (t1 < 0, t2 > 0).
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 0)
}
