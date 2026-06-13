import type { Enemy, Vec2 } from '../types'

// Direction of the force: pull enemies toward the center, or push them away.
export const RadialForceMode = { pull: 'pull', push: 'push' } as const
export type RadialForceMode = (typeof RadialForceMode)[keyof typeof RadialForceMode]

// Plateau falloff: full force inside ~25% of the radius, smooth cosine drop to
// zero at the edge — so fine cursor positioning isn't required for peak force.
const PLATEAU = 0.25

// Moves every enemy within `radius` of `center` toward it (`pull`) or away from
// it (`push`) by the plateau-cosine force, scaled by dt. Shared by Telekinesis
// (push) and Singularity (pull).
export function applyRadialForce(
  enemies: Enemy[],
  center: Vec2,
  radius: number,
  peakForce: number,
  mode: RadialForceMode,
  dt: number
): Enemy[] {
  const sign = mode === RadialForceMode.pull ? 1 : -1
  const forceAt = (dist: number): number => {
    if (dist >= radius) return 0
    const x = dist / radius
    if (x <= PLATEAU) return peakForce
    const t = (x - PLATEAU) / (1 - PLATEAU)
    return peakForce * 0.5 * (Math.cos(Math.PI * t) + 1)
  }
  return enemies.map((enemy) => {
    const dx = center.x - enemy.pos.x
    const dy = center.y - enemy.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.01) return enemy
    const f = forceAt(dist)
    if (f === 0) return enemy
    const step = f * dt * sign
    return {
      ...enemy,
      pos: { x: enemy.pos.x + (dx / dist) * step, y: enemy.pos.y + (dy / dist) * step },
    }
  })
}
