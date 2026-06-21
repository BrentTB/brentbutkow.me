import { canEnemyTakeDamage } from '../bosses'
import { applyDamageToAlly } from '../entities/ally'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { spawnExplosionParticles } from '../entities/entity-creator'
import { applyDamageToShip } from '../entities/ship'
import { toroidalDistance } from '../math/toroid'
import type { Ally, Enemy, Particle, Ship, Vec2 } from '../types'

export type RadialDamageResult = {
  ship: Ship
  enemies: Enemy[]
  allies: Ally[]
  killedEnemies: Enemy[]
  particles: Particle[]
}

// The shared "calamity damages everyone" primitive. Damages every entity — ship,
// enemies, allies — whose centre lies in the annulus (innerRadius, outerRadius]
// around `center`. `damageAt` returns the damage for a given distance, so callers
// own the falloff: a flat blast for a mine (inner = 0, solid disc) or a
// centre-weighted sweep for a Shockwave's expanding front (inner > 0, a ring).
//
// Enemy hits gate on canEnemyTakeDamage (invincible bosses shrug it off); enemies
// reduced to 0 HP are returned in `killedEnemies` for the caller to route through
// the normal death pipeline. Ship immunity (Escape Mode) and shields are handled
// by the per-entity damage helpers, so this stays a pure dispatcher.
export function applyRadialDamage(
  center: Vec2,
  innerRadius: number,
  outerRadius: number,
  damageAt: (dist: number) => number,
  ship: Ship,
  enemies: Enemy[],
  allies: Ally[],
  particleColor: string
): RadialDamageResult {
  const inRing = (pos: Vec2): number => {
    const d = toroidalDistance(pos, center)
    if (d > outerRadius) return -1
    // Lower bound is exclusive for an annulus (so a shockwave front never re-hits
    // the edge it already cleared last frame) but inclusive for a solid disc, so an
    // entity sitting dead-centre on a mine (distance 0) still takes the blast.
    const aboveInner = innerRadius > 0 ? d > innerRadius : d >= innerRadius
    return aboveInner ? d : -1
  }

  const shipDist = inRing(ship.pos)
  const nextShip = shipDist >= 0 ? applyDamageToShip(ship, damageAt(shipDist)) : ship

  const survivingEnemies: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []
  for (const enemy of enemies) {
    const d = inRing(enemy.pos)
    if (d < 0 || !canEnemyTakeDamage(enemy, enemies)) {
      survivingEnemies.push(enemy)
      continue
    }
    const damaged = applyDamageToEnemy(enemy, damageAt(d))
    if (damaged.hp <= 0) {
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, particleColor))
    } else {
      survivingEnemies.push(damaged)
    }
  }

  const survivingAllies: Ally[] = []
  for (const ally of allies) {
    const d = inRing(ally.pos)
    const damaged = d >= 0 ? applyDamageToAlly(ally, damageAt(d)) : ally
    if (damaged.hp > 0) survivingAllies.push(damaged)
  }

  return {
    ship: nextShip,
    enemies: survivingEnemies,
    allies: survivingAllies,
    killedEnemies,
    particles,
  }
}
