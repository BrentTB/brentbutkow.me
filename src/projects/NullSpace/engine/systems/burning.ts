import { canEnemyTakeDamage } from '../bosses/index'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { createParticle, spawnExplosionParticles } from '../entities/entity-creator'
import { rng } from '../math/random'
import { toroidalDelta } from '../math/toroid'
import type { BurningState, Enemy, Particle } from '../types'

export type BurningResult = {
  enemies: Enemy[]
  killedEnemies: Enemy[]
  scoreGained: number
  particles: Particle[]
}

// Bright hot core through to deep ember — a white-yellow lick reads clearly
// against enemy sprites and the dark playfield.
const FIRE_COLORS = ['#ffffff', '#fff2a0', '#ffcc44', '#ff8822', '#ff4d22']

// Flame licks rising off the burning enemy. Big and bright so the status is
// obvious at a glance; spawned a few per frame from updateBurningEnemies.
function fireParticle(enemy: Enemy): Particle {
  const r = enemy.radius
  return createParticle(
    { x: enemy.pos.x + rng.range(-r, r), y: enemy.pos.y + rng.range(-r, r) },
    { x: rng.range(-18, 18), y: rng.range(-65, -25) },
    FIRE_COLORS[Math.floor(rng.next() * FIRE_COLORS.length)],
    0.35 + rng.next() * 0.4,
    4 + rng.next() * 5
  )
}

// Solar Plague's fire: each frame, burning enemies take DOT, the flame jumps to
// nearby non-burning enemies, and the timer ticks down (clearing the status when
// it expires). Spread is sourced from the enemies burning at the START of the
// frame, so a freshly-lit enemy only begins spreading next frame (no same-frame
// chain reaction across the whole map).
export function updateBurningEnemies(enemies: Enemy[], dt: number): BurningResult {
  // Plan ignitions from currently-burning sources to non-burning, damageable
  // neighbours within the source's spread range (measured edge-to-edge).
  const ignitions = new Map<string, BurningState>()
  for (const src of enemies) {
    if (!src.burning) continue
    for (const tgt of enemies) {
      if (tgt.id === src.id || tgt.burning || ignitions.has(tgt.id)) continue
      if (!canEnemyTakeDamage(tgt, enemies)) continue
      const { x: dx, y: dy } = toroidalDelta(src.pos, tgt.pos)
      const gap = Math.sqrt(dx * dx + dy * dy) - tgt.radius - src.radius
      if (gap <= src.burning.spreadRange) {
        ignitions.set(tgt.id, { ...src.burning, remaining: src.burning.duration })
      }
    }
  }

  const survivors: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []
  let scoreGained = 0

  for (const enemy of enemies) {
    const burning = enemy.burning ?? ignitions.get(enemy.id)
    if (!burning) {
      survivors.push(enemy)
      continue
    }

    // Invincible enemies (shielded boss) keep the flame's timer running but take
    // no damage until the shield drops.
    const damage = canEnemyTakeDamage(enemy, enemies) ? burning.dps * dt : 0
    const remaining = burning.remaining - dt
    const damaged = applyDamageToEnemy(enemy, damage)
    // A couple of licks per frame keeps a steady, readable flame.
    particles.push(fireParticle(enemy), fireParticle(enemy))
    if (rng.next() < 0.5) particles.push(fireParticle(enemy))

    if (damaged.hp <= 0) {
      scoreGained += enemy.scoreValue
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff7733'))
      continue
    }

    survivors.push({
      ...damaged,
      burning: remaining > 0 ? { ...burning, remaining } : undefined,
    })
  }

  return { enemies: survivors, killedEnemies, scoreGained, particles }
}
