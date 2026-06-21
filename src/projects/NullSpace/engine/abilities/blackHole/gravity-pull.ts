import { canEnemyTakeDamage } from '../../bosses'
import { applyDamageToEnemy } from '../../entities/enemy-damage'
import { spawnExplosionParticles } from '../../entities/entity-creator'
import { impartAsteroidImpulse } from '../telekinesis/radial-force'
import { toroidalDelta, wrapPosition } from '../../math/toroid'
import { rng } from '../../math/random'
import type { Asteroid, Enemy, Particle, Vec2 } from '../../types'

// A gravity well that spirals enemies inward and burns them while they're caught.
// Shared by Black Hole and Event Horizon (which adds the core banish).
export type GravityWell = {
  pos: Vec2
  radius: number
  pullStrength: number
  damage: number
}

// Event Horizon's core behaviour: an enemy reaching `coreRadius` takes
// `coreDamage` (flat) and is relocated `banishDistance` further from `shipPos`
// (wrapped onto the torus). Bosses and invincible enemies are exempt — they
// keep spiralling like a plain black hole.
export type BanishConfig = {
  coreRadius: number
  coreDamage: number
  banishDistance: number
  shipPos: Vec2
}

export type GravityWellResult = {
  enemies: Enemy[]
  scoreGained: number
  killedEnemies: Enemy[]
  particles: Particle[]
}

// Spiral weighting: mostly tangential (orbit) with a gentle radial draw inward,
// so enemies swirl toward the center rather than falling straight in.
const SPIRAL_RADIAL = 0.25
const SPIRAL_TANGENTIAL = 0.85

// Relocates an enemy radially outward from the ship by `banishDistance`, wrapped
// onto the torus. Past the well's reach, so it isn't instantly re-pulled.
function banishPos(enemyPos: Vec2, cfg: BanishConfig): Vec2 {
  const { x: dx, y: dy } = toroidalDelta(cfg.shipPos, enemyPos)
  const dist = Math.sqrt(dx * dx + dy * dy)
  const angle = dist > 1 ? Math.atan2(dy, dx) : rng.next() * Math.PI * 2
  const nx = dist > 1 ? dx / dist : Math.cos(angle)
  const ny = dist > 1 ? dy / dist : Math.sin(angle)
  const newDist = dist + cfg.banishDistance
  return wrapPosition({ x: cfg.shipPos.x + nx * newDist, y: cfg.shipPos.y + ny * newDist })
}

// The spiral offset a gravity well imparts to a single body at `pos` this frame —
// mostly tangential (orbit) with a gentle inward draw. Motion only, no damage, so
// it moves any body: enemies under a Black Hole, or the ship/allies/asteroids
// caught in a wandering well. Zero outside the well's radius.
export function gravityWellDisplacement(pos: Vec2, well: GravityWell, dt: number): Vec2 {
  const { x: dx, y: dy } = toroidalDelta(pos, well.pos)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > well.radius) return { x: 0, y: 0 }
  const nx = dist > 1 ? dx / dist : 0
  const ny = dist > 1 ? dy / dist : 0
  const strength = (1 - dist / well.radius) * well.pullStrength * dt
  return {
    x: nx * strength * SPIRAL_RADIAL - ny * strength * SPIRAL_TANGENTIAL,
    y: ny * strength * SPIRAL_RADIAL + nx * strength * SPIRAL_TANGENTIAL,
  }
}

// Per-second core burn a gravity well deals at `dist` from its centre — flat-ish at
// the rim, ramping up toward the core. Shared by Black Hole spirals, the wandering
// well's blast, and asteroid damage.
export function gravityWellBurn(damage: number, dist: number, radius: number, dt: number): number {
  const ratio = Math.max(0, 1 - dist / radius)
  return damage * (0.5 + ratio * 1.5) * dt
}

// A gravity well's spiral applied to an asteroid as a velocity impulse — it keeps
// drifting after the well passes (vs the position nudge enemies get). Neutral: the
// loot flag is set by the damage pass, not the shove.
export function gravityWellImpulse(a: Asteroid, well: GravityWell, dt: number): Asteroid {
  return impartAsteroidImpulse(a, gravityWellDisplacement(a.pos, well, dt))
}

export function applyGravityWell(
  enemies: Enemy[],
  well: GravityWell,
  dt: number,
  opts: { particleColor: string; banish?: BanishConfig }
): GravityWellResult {
  let scoreGained = 0
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []

  for (const enemy of enemies) {
    const { x: dx, y: dy } = toroidalDelta(enemy.pos, well.pos)
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > well.radius) {
      surviving.push(enemy)
      continue
    }

    const damageable = canEnemyTakeDamage(enemy, enemies)

    // Core banish (Event Horizon): zap + teleport away. Bosses are too scripted
    // to fling around, so they spiral like a plain well instead.
    if (opts.banish && dist <= opts.banish.coreRadius && damageable && !enemy.boss) {
      const next = {
        ...applyDamageToEnemy(enemy, opts.banish.coreDamage),
        pos: banishPos(enemy.pos, opts.banish),
      }
      particles.push(...spawnExplosionParticles(enemy.pos, 10, opts.particleColor))
      if (next.hp <= 0) {
        scoreGained += enemy.scoreValue
        killedEnemies.push(enemy)
      } else {
        surviving.push(next)
      }
      continue
    }

    const { x: spiralX, y: spiralY } = gravityWellDisplacement(enemy.pos, well, dt)

    const damageThisTick = damageable ? gravityWellBurn(well.damage, dist, well.radius, dt) : 0

    const moved = {
      ...applyDamageToEnemy(enemy, damageThisTick),
      pos: { x: enemy.pos.x + spiralX, y: enemy.pos.y + spiralY },
    }

    if (moved.hp <= 0) {
      scoreGained += enemy.scoreValue
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, opts.particleColor))
    } else {
      surviving.push(moved)
    }
  }

  return { enemies: surviving, scoreGained, killedEnemies, particles }
}
