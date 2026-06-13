import { HAZARD } from '../../data'
import { uid } from '../entities/entity-creator'
import { distance } from '../math/collision'
import { rng } from '../math/random'
import { HazardKind } from '../types'
import type { Hazard, Ship } from '../types'

// Mines scattered sparsely over the whole corridor (the `[minY, maxY]` stretch
// the ship traverses), kept off the lateral edges so a slingshot dash always has
// a gap. Thread between them as the ship advances — Escape Mode dashes through.
export function generateHazardField(opts: {
  corridorCenterX: number
  corridorHalfWidth: number
  minY: number
  maxY: number
}): Hazard[] {
  const { corridorCenterX, corridorHalfWidth, minY, maxY } = opts
  const lateral = corridorHalfWidth * HAZARD.lateralFraction
  const mines: Hazard[] = []
  for (let i = 0; i < HAZARD.mineCount; i++) {
    mines.push({
      id: uid(),
      kind: HazardKind.mine,
      pos: {
        x: corridorCenterX + rng.range(-lateral, lateral),
        y: rng.range(minY, maxY),
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
