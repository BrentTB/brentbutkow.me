import { HAZARD } from '../../data'
import { uid } from '../entities/entity-creator'
import { distance } from '../math/collision'
import { toroidalDistance } from '../math/toroid'
import { rng } from '../math/random'
import { HazardKind } from '../types'
import type { Hazard, Ship, Vec2 } from '../types'

// Mines scattered sparsely across the torus, kept clear of the ship's spawn so a
// fresh sector never drops one on the player. Thread between them as you fly —
// Escape Mode dashes through.
export function generateHazardField(worldSize: Vec2, safeCenter: Vec2): Hazard[] {
  const mines: Hazard[] = []
  let attempts = 0
  while (mines.length < HAZARD.mineCount && attempts < HAZARD.mineCount * 12) {
    attempts++
    const pos = { x: rng.range(0, worldSize.x), y: rng.range(0, worldSize.y) }
    if (toroidalDistance(pos, safeCenter) < HAZARD.forwardMargin) continue
    mines.push({
      id: uid(),
      kind: HazardKind.mine,
      pos,
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
