import type { Vec2 } from '../types'

/**
 * Move a point toward a target with a constant magnet speed. The returned
 * velocity overwrites the input — useful for "snap to chase" behavior where
 * the chaser should accelerate to top speed immediately rather than gradually.
 *
 * Used by collectible power orbs / clicked space metal flying into the ship,
 * and intended for future homing projectiles / ally drones / etc.
 */
export function homeTowardTarget(
  pos: Vec2,
  target: Vec2,
  strength: number,
  dt: number
): { pos: Vec2; vel: Vec2 } {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= 0.1) {
    return { pos: { ...pos }, vel: { x: 0, y: 0 } }
  }
  const vx = (dx / dist) * strength
  const vy = (dy / dist) * strength
  return {
    pos: { x: pos.x + vx * dt, y: pos.y + vy * dt },
    vel: { x: vx, y: vy },
  }
}
