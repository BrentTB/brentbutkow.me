import type { Entity } from './types'

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
