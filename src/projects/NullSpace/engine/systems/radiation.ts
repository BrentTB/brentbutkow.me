import { canEnemyTakeDamage } from '../bosses'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { createParticle, spawnExplosionParticles } from '../entities/entity-creator'
import { rng } from '../math/random'
import { toroidalDelta, toroidalDistance } from '../math/toroid'
import { RADIATION } from '../abilities/ability-data'
import type { Enemy, Particle, RadiationState, Vec2 } from '../types'

export type RadiationResult = {
  enemies: Enemy[]
  killedEnemies: Enemy[]
  scoreGained: number
  particles: Particle[]
}

// A radiation pool reduced to the params the per-enemy tick reads each frame.
export type RadiationZone = {
  pos: Vec2
  radius: number
  dpsPerStack: number
  maxStacks: number
  spreadRange: number
}

// Sickly radioactive greens — reads apart from Solar Plague's lighter lime.
const RAD_GREEN = ['#caff5a', '#9be62a', '#5fd820', '#39ff14']

function radParticle(enemy: Enemy): Particle {
  const r = enemy.radius
  return createParticle(
    { x: enemy.pos.x + rng.range(-r, r), y: enemy.pos.y + rng.range(-r, r) },
    { x: rng.range(-12, 12), y: rng.range(-45, -15) },
    RAD_GREEN[Math.floor(rng.next() * RAD_GREEN.length)],
    0.3 + rng.next() * 0.3,
    2 + rng.next() * 3
  )
}

// The pool an enemy stands in (the hottest one when pools overlap), or null.
function zoneAt(pos: Vec2, zones: RadiationZone[]): RadiationZone | null {
  let best: RadiationZone | null = null
  for (const z of zones) {
    if (toroidalDistance(pos, z.pos) > z.radius) continue
    if (!best || z.dpsPerStack > best.dpsPerStack) best = z
  }
  return best
}

function freshState(maxStacks: number, dpsPerStack: number, spreadRange: number): RadiationState {
  return {
    stacks: 1,
    maxStacks,
    dpsPerStack,
    spreadRange,
    gainCooldown: RADIATION.stackInterval,
    decayCooldown: RADIATION.decayInterval,
  }
}

// Each frame: enemies in a pool gain stacks (capped), enemies outside decay them
// one at a time, every irradiated enemy takes stacks × dpsPerStack, and (Meltdown
// only) a max-stacked enemy seeds radiation on non-irradiated neighbours within
// spreadRange. Mirrors updateBurningEnemies' shape so the game loop wires it the
// same way. The DOT + decay live here, not on the pool, so stacks persist after
// an enemy leaves the zone — and after the pool itself expires.
export function updateRadiatedEnemies(
  enemies: Enemy[],
  zones: RadiationZone[],
  dt: number
): RadiationResult {
  // Plan contagion from max-stacked sources (Meltdown) to non-irradiated,
  // damageable neighbours — sourced from this frame's start, so a freshly-seeded
  // enemy only spreads next frame (matches the burning model, no chain reaction).
  const seeds = new Map<string, RadiationState>()
  for (const src of enemies) {
    const r = src.radiation
    if (!r || r.spreadRange <= 0 || r.stacks < r.maxStacks) continue
    for (const tgt of enemies) {
      if (tgt.id === src.id || tgt.radiation || seeds.has(tgt.id)) continue
      if (!canEnemyTakeDamage(tgt, enemies)) continue
      const { x: dx, y: dy } = toroidalDelta(src.pos, tgt.pos)
      const gap = Math.hypot(dx, dy) - tgt.radius - src.radius
      if (gap <= r.spreadRange) {
        seeds.set(tgt.id, freshState(r.maxStacks, r.dpsPerStack, r.spreadRange))
      }
    }
  }

  const survivors: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []
  let scoreGained = 0

  for (const enemy of enemies) {
    const zone = zoneAt(enemy.pos, zones)
    let rad =
      enemy.radiation ??
      seeds.get(enemy.id) ??
      (zone ? freshState(zone.maxStacks, zone.dpsPerStack, zone.spreadRange) : undefined)
    if (!rad) {
      survivors.push(enemy)
      continue
    }

    // Standing in a pool adopts that pool's per-stack params (so an upgraded pool
    // takes over) and keeps the strongest contagion reach seen.
    if (zone) {
      rad = {
        ...rad,
        maxStacks: zone.maxStacks,
        dpsPerStack: zone.dpsPerStack,
        spreadRange: Math.max(rad.spreadRange, zone.spreadRange),
      }
    }

    let { stacks, gainCooldown, decayCooldown } = rad
    if (zone) {
      decayCooldown = RADIATION.decayInterval
      gainCooldown -= dt
      if (gainCooldown <= 0) {
        if (stacks < rad.maxStacks) stacks++
        gainCooldown += RADIATION.stackInterval
      }
    } else {
      decayCooldown -= dt
      if (decayCooldown <= 0) {
        stacks--
        decayCooldown = RADIATION.decayInterval
      }
    }

    if (stacks <= 0) {
      survivors.push({ ...enemy, radiation: undefined })
      continue
    }

    // Invincible enemies (shielded boss) keep their stacks but take no damage.
    const damage = canEnemyTakeDamage(enemy, enemies) ? stacks * rad.dpsPerStack * dt : 0
    const damaged = applyDamageToEnemy(enemy, damage)
    particles.push(radParticle(enemy))
    if (rng.next() < 0.3 + stacks * 0.05) particles.push(radParticle(enemy))

    if (damaged.hp <= 0) {
      scoreGained += enemy.scoreValue
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, '#7fff1a'))
      continue
    }

    survivors.push({ ...damaged, radiation: { ...rad, stacks, gainCooldown, decayCooldown } })
  }

  return { enemies: survivors, killedEnemies, scoreGained, particles }
}
