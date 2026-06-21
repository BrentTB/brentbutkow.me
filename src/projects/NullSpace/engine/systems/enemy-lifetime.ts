import { applyDamageToShip } from '../entities/ship'
import { applyDamageToAlly } from '../entities/ally'
import { spawnExplosionParticles } from '../entities/entity-creator'
import { toroidalDistance } from '../math/toroid'
import type { Ally, Enemy, Particle, Ship } from '../types'

// Magenta pop, matching the Phase Shifter's brood swarms.
const EXPIRE_BLAST_COLOR = '#ff66cc'

// Ages out enemies carrying an `expiresIn` timer (currently the Phase Shifter's swarm
// rings) and detonates the ones that hit zero: a small blast that hurts the ship +
// allies caught on top of the dispersing ring, then they're gone — so the swarms can
// never pile up faster than you clear them. Timer-less enemies pass through untouched.
// Pure.
export function detonateExpiredEnemies(
  enemies: Enemy[],
  ship: Ship,
  allies: Ally[],
  dt: number
): { enemies: Enemy[]; ship: Ship; allies: Ally[]; particles: Particle[] } {
  // Common case: nothing is on a timer — skip all the work (and the allocation).
  if (!enemies.some((e) => e.expiresIn !== undefined)) {
    return { enemies, ship, allies, particles: [] }
  }

  const alive: Enemy[] = []
  let nextShip = ship
  let nextAllies = allies
  let particles: Particle[] = []
  for (const e of enemies) {
    if (e.expiresIn === undefined) {
      alive.push(e)
      continue
    }
    const expiresIn = e.expiresIn - dt
    if (expiresIn > 0) {
      alive.push({ ...e, expiresIn })
      continue
    }
    // Timed out: pop. Hurt the ship + allies caught in the blast, then drop it.
    particles = [...particles, ...spawnExplosionParticles(e.pos, 8, EXPIRE_BLAST_COLOR)]
    const blast = e.expireBlast
    if (blast) {
      if (toroidalDistance(e.pos, nextShip.pos) <= blast.radius) {
        nextShip = applyDamageToShip(nextShip, blast.damage)
      }
      nextAllies = nextAllies.map((a) =>
        toroidalDistance(e.pos, a.pos) <= blast.radius ? applyDamageToAlly(a, blast.damage) : a
      )
    }
  }
  return { enemies: alive, ship: nextShip, allies: nextAllies, particles }
}
