import { HAZARD } from '../../data'
import { uid } from '../entities/entity-creator'
import { distance } from '../math/collision'
import { rng } from '../math/random'
import { HazardKind } from '../types'
import type { Hazard, Ship } from '../types'

// A mine cluster scattered laterally within the corridor at `laneY`, kept off the
// edges so a lateral slingshot dash (or an Escape-Mode dash) always has a gap.
export function generateHazardLane(opts: {
  corridorCenterX: number
  corridorHalfWidth: number
  laneY: number
}): Hazard[] {
  const { corridorCenterX, corridorHalfWidth, laneY } = opts
  const mines: Hazard[] = []
  for (let i = 0; i < HAZARD.minesPerCluster; i++) {
    mines.push({
      id: uid(),
      kind: HazardKind.mine,
      pos: {
        x: corridorCenterX + rng.range(-corridorHalfWidth * 0.6, corridorHalfWidth * 0.6),
        y: laneY + rng.range(-HAZARD.clusterSpread, HAZARD.clusterSpread),
      },
      radius: HAZARD.mineRadius,
      damage: HAZARD.mineDamage,
      hitCooldown: 0,
    })
  }
  return mines
}

// Ticks hazard cooldowns and reports damage from any mine overlapping the ship
// (each mine debounces via its own `hitCooldown`). The caller routes `shipDamage`
// through applyDamageToShip, so Escape-Mode immunity drops a dash-through's damage.
export function updateHazards(
  hazards: Hazard[],
  ship: Ship,
  dt: number
): { hazards: Hazard[]; shipDamage: number } {
  if (hazards.length === 0) return { hazards, shipDamage: 0 }
  let shipDamage = 0
  const next = hazards.map((h) => {
    const cooldown = Math.max(0, h.hitCooldown - dt)
    if (cooldown <= 0 && distance(h.pos, ship.pos) < h.radius + ship.radius) {
      shipDamage += h.damage
      return { ...h, hitCooldown: HAZARD.hitCooldown }
    }
    return cooldown === h.hitCooldown ? h : { ...h, hitCooldown: cooldown }
  })
  return { hazards: next, shipDamage }
}
