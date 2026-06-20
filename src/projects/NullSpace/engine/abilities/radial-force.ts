import { toroidalDelta, wrapPosition } from '../math/toroid'
import type { Asteroid, Enemy, Vec2 } from '../types'

// Direction of the force: pull bodies toward the center, or push them away.
export const RadialForceMode = { pull: 'pull', push: 'push' } as const
export type RadialForceMode = (typeof RadialForceMode)[keyof typeof RadialForceMode]

// Plateau falloff: full force inside ~25% of the radius, smooth cosine drop to
// zero at the edge — so fine cursor positioning isn't required for peak force.
const PLATEAU = 0.25

// The position offset a radial force imparts to a single body at `pos` this frame
// — `pull` toward `center`, `push` away — under the plateau-cosine falloff. Zero
// outside the radius or at the dead centre. Body-agnostic (takes a bare position),
// so enemies, asteroids, and the ship all move under the same force math.
export function radialForceDisplacement(
  pos: Vec2,
  center: Vec2,
  radius: number,
  peakForce: number,
  mode: RadialForceMode,
  dt: number
): Vec2 {
  const { x: dx, y: dy } = toroidalDelta(pos, center)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.01 || dist >= radius) return { x: 0, y: 0 }
  const x = dist / radius
  const force =
    x <= PLATEAU
      ? peakForce
      : peakForce * 0.5 * (Math.cos(Math.PI * ((x - PLATEAU) / (1 - PLATEAU))) + 1)
  if (force === 0) return { x: 0, y: 0 }
  const step = force * dt * (mode === RadialForceMode.pull ? 1 : -1)
  return { x: (dx / dist) * step, y: (dy / dist) * step }
}

// Moves every enemy within `radius` of `center` toward it (`pull`) or away from
// it (`push`) by the shared radial displacement. Telekinesis (push) + Singularity (pull).
export function applyRadialForce(
  enemies: Enemy[],
  center: Vec2,
  radius: number,
  peakForce: number,
  mode: RadialForceMode,
  dt: number
): Enemy[] {
  return enemies.map((enemy) => {
    const d = radialForceDisplacement(enemy.pos, center, radius, peakForce, mode, dt)
    if (d.x === 0 && d.y === 0) return enemy
    return { ...enemy, pos: { x: enemy.pos.x + d.x, y: enemy.pos.y + d.y } }
  })
}

// Shoves asteroids by the same radial force and latches their loot flag (the
// player moved them). Lives here, not in calamities/, so the hold abilities can
// fling asteroids without an abilities↔calamities import cycle.
export function applyRadialForceToAsteroids(
  asteroids: Asteroid[],
  center: Vec2,
  radius: number,
  peakForce: number,
  mode: RadialForceMode,
  dt: number
): Asteroid[] {
  return asteroids.map((a) => {
    const d = radialForceDisplacement(a.pos, center, radius, peakForce, mode, dt)
    if (d.x === 0 && d.y === 0) return a
    return {
      ...a,
      pos: wrapPosition({ x: a.pos.x + d.x, y: a.pos.y + d.y }),
      playerInteracted: true,
    }
  })
}
