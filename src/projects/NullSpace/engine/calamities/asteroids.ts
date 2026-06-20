import { ASTEROID } from '../../data'
import { applyRadialDamage } from './calamity-damage'
import { gravityWellDisplacement } from '../abilities/gravity-pull'
import { impartAsteroidImpulse } from '../abilities/radial-force'
import { getSupernovaState } from '../abilities/supernova'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { segmentIntersectsCircle } from '../math/collision'
import { toroidalDelta, toroidalDistance, wrapPosition } from '../math/toroid'
import { rng } from '../math/random'
import { AsteroidTier, EffectKind, ProjectileOwner } from '../types'
import type {
  ActiveEffect,
  Ally,
  Asteroid,
  Enemy,
  Particle,
  Projectile,
  Ship,
  Vec2,
} from '../types'

// Tier a destroyed asteroid breaks into; `null` for the smallest (it just dies).
const NEXT_TIER: Record<AsteroidTier, AsteroidTier | null> = {
  [AsteroidTier.large]: AsteroidTier.medium,
  [AsteroidTier.medium]: AsteroidTier.small,
  [AsteroidTier.small]: null,
}

// Relative mass per tier — drives the asteroid-vs-asteroid bounce so a small rock
// ricochets off a large one rather than shoving it.
const MASS: Record<AsteroidTier, number> = {
  [AsteroidTier.large]: 3,
  [AsteroidTier.medium]: 2,
  [AsteroidTier.small]: 1,
}

export function createAsteroid(tier: AsteroidTier, pos: Vec2, vel: Vec2): Asteroid {
  const t = ASTEROID.tiers[tier]
  return {
    id: uid(),
    tier,
    pos: { ...pos },
    vel: { ...vel },
    radius: t.radius,
    hp: t.hp,
    maxHp: t.hp,
    spin: rng.range(0, Math.PI * 2),
    spinVel: rng.range(-ASTEROID.spinMax, ASTEROID.spinMax),
    variant: rng.intRange(0, ASTEROID.variantCount - 1),
    hitCooldown: 0,
    playerInteracted: false,
  }
}

function randomDrift(tier: AsteroidTier): Vec2 {
  const angle = rng.range(0, Math.PI * 2)
  const speed = ASTEROID.tiers[tier].driftSpeed
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
}

// A handful of large/medium asteroids drifting at sector start, kept clear of the
// ship's spawn. Mirrors generateHazardField; large ones break down into smalls in play.
export function seedAsteroidField(worldSize: Vec2, safeCenter: Vec2): Asteroid[] {
  const out: Asteroid[] = []
  let attempts = 0
  while (out.length < ASTEROID.seedCount && attempts < ASTEROID.seedCount * 12) {
    attempts++
    const pos = { x: rng.range(0, worldSize.x), y: rng.range(0, worldSize.y) }
    if (toroidalDistance(pos, safeCenter) < ASTEROID.forwardMargin) continue
    const tier = rng.next() < 0.6 ? AsteroidTier.large : AsteroidTier.medium
    out.push(createAsteroid(tier, pos, randomDrift(tier)))
  }
  return out
}

// Drift + cosmetic spin + contact-cooldown tick, then resolve asteroid-asteroid
// bounces. The mapped objects are fresh, so the bounce pass mutates them in place.
export function updateAsteroids(asteroids: Asteroid[], dt: number): Asteroid[] {
  if (asteroids.length === 0) return asteroids
  const moved = asteroids.map((a) => ({
    ...a,
    pos: wrapPosition({ x: a.pos.x + a.vel.x * dt, y: a.pos.y + a.vel.y * dt }),
    spin: a.spin + a.spinVel * dt,
    hitCooldown: Math.max(0, a.hitCooldown - dt),
  }))
  resolveAsteroidCollisions(moved)
  return moved
}

// Elastic-ish separation: when two asteroids overlap, exchange momentum along the
// collision normal (scaled by tier mass) and push them apart so they don't stick.
function resolveAsteroidCollisions(list: Asteroid[]): void {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const { x: dx, y: dy } = toroidalDelta(a.pos, b.pos) // a → b
      const dist = Math.hypot(dx, dy)
      const minDist = a.radius + b.radius
      if (dist >= minDist || dist < 0.0001) continue
      const nx = dx / dist
      const ny = dy / dist
      const ma = MASS[a.tier]
      const mb = MASS[b.tier]
      const along = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny
      if (along < 0) {
        const impulse = (-(1 + ASTEROID.restitution) * along) / (1 / ma + 1 / mb)
        a.vel = { x: a.vel.x - (impulse * nx) / ma, y: a.vel.y - (impulse * ny) / ma }
        b.vel = { x: b.vel.x + (impulse * nx) / mb, y: b.vel.y + (impulse * ny) / mb }
      }
      const push = (minDist - dist) / 2
      a.pos = wrapPosition({ x: a.pos.x - nx * push, y: a.pos.y - ny * push })
      b.pos = wrapPosition({ x: b.pos.x + nx * push, y: b.pos.y + ny * push })
    }
  }
}

// Applies damage to an asteroid; `byPlayer` latches the loot-eligibility flag.
// The caller reads `.hp <= 0` to decide a destruction + split.
export function damageAsteroid(asteroid: Asteroid, damage: number, byPlayer: boolean): Asteroid {
  if (damage <= 0) return byPlayer ? markInteracted(asteroid) : asteroid
  return {
    ...asteroid,
    hp: asteroid.hp - damage,
    playerInteracted: asteroid.playerInteracted || byPlayer,
  }
}

// Latches the loot flag when an ability merely moves the asteroid (no damage).
export function markInteracted(asteroid: Asteroid): Asteroid {
  return asteroid.playerInteracted ? asteroid : { ...asteroid, playerInteracted: true }
}

// Two fragments of the next-smaller tier, fanned out around the parent's heading
// and inheriting its momentum plus a scatter kick. Empty for the smallest tier.
// The loot flag carries over, so shooting a large rock makes its children lootable.
export function splitAsteroid(asteroid: Asteroid): Asteroid[] {
  const next = NEXT_TIER[asteroid.tier]
  if (next === null) return []
  const base = Math.atan2(asteroid.vel.y, asteroid.vel.x)
  const frags: Asteroid[] = []
  for (let i = 0; i < ASTEROID.splitCount; i++) {
    const spread = (i / Math.max(1, ASTEROID.splitCount - 1) - 0.5) * Math.PI
    const angle = base + spread
    const frag = createAsteroid(next, asteroid.pos, {
      x: asteroid.vel.x + Math.cos(angle) * ASTEROID.splitScatter,
      y: asteroid.vel.y + Math.sin(angle) * ASTEROID.splitScatter,
    })
    frag.playerInteracted = asteroid.playerInteracted
    frags.push(frag)
  }
  return frags
}

export type AsteroidContactResult = {
  asteroids: Asteroid[]
  killedAsteroids: Asteroid[]
  ship: Ship
  enemies: Enemy[]
  allies: Ally[]
  killedEnemies: Enemy[]
  particles: Particle[]
}

// Asteroids damage everyone they touch, debounced per-asteroid so brushing one
// chips rather than drains. On a hit, blast everyone within the asteroid's reach
// via the shared radial primitive (Escape-Mode immunity + boss gating handled
// there), then the collision wears the rock down too (ASTEROID.bumpSelfDamage,
// non-player so it drops no loot) — enough bumps shatter it. Calamity kills carry
// no score; killed enemies and the broken rocks flow back for the death pipeline.
export function resolveAsteroidContacts(
  asteroids: Asteroid[],
  ship: Ship,
  enemies: Enemy[],
  allies: Ally[]
): AsteroidContactResult {
  if (asteroids.length === 0) {
    return {
      asteroids,
      killedAsteroids: [],
      ship,
      enemies,
      allies,
      killedEnemies: [],
      particles: [],
    }
  }
  let curShip = ship
  let curEnemies = enemies
  let curAllies = allies
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []

  const next = asteroids.map((a) => {
    if (a.hitCooldown > 0) return a
    const reach = a.radius + ASTEROID.contactPad
    const touches =
      toroidalDistance(a.pos, curShip.pos) < reach ||
      curEnemies.some((e) => toroidalDistance(a.pos, e.pos) < reach) ||
      curAllies.some((al) => toroidalDistance(a.pos, al.pos) < reach)
    if (!touches) return a
    const blast = applyRadialDamage(
      a.pos,
      0,
      reach,
      () => ASTEROID.tiers[a.tier].contactDamage,
      curShip,
      curEnemies,
      curAllies,
      ASTEROID.color
    )
    curShip = blast.ship
    curEnemies = blast.enemies
    curAllies = blast.allies
    killedEnemies.push(...blast.killedEnemies)
    particles.push(...blast.particles)
    return damageAsteroid(
      { ...a, hitCooldown: ASTEROID.contactCooldown },
      ASTEROID.bumpSelfDamage,
      false
    )
  })

  return {
    asteroids: next.filter((a) => a.hp > 0),
    killedAsteroids: next.filter((a) => a.hp <= 0),
    ship: curShip,
    enemies: curEnemies,
    allies: curAllies,
    killedEnemies,
    particles,
  }
}

export type ProjectileAsteroidResult = {
  projectiles: Projectile[]
  asteroids: Asteroid[]
  killedAsteroids: Asteroid[]
  particles: Particle[]
}

// Player/ally projectiles chip asteroids (always `byPlayer`, so they become
// loot-eligible). Pierce rounds pass through, deduped via their own hit list;
// a detonating round blasts every asteroid in its aoe; everything else is consumed
// on first contact. Killed rocks come back for the caller to split + drop loot.
export function resolveProjectileAsteroidCollisions(
  projectiles: Projectile[],
  asteroids: Asteroid[]
): ProjectileAsteroidResult {
  if (asteroids.length === 0 || projectiles.length === 0) {
    return { projectiles, asteroids, killedAsteroids: [], particles: [] }
  }
  const hitProjectiles = new Set<Projectile>()
  const particles: Particle[] = []
  let working = asteroids.map((a) => ({ ...a }))

  const hits = (proj: Projectile, a: Asteroid): boolean =>
    segmentIntersectsCircle(proj.prevPos ?? proj.pos, proj.pos, a.pos, a.radius + proj.radius)

  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.ship) continue

    if (proj.pierce) {
      const { maxHits, hitEnemyIds } = proj.pierce
      for (let i = 0; i < working.length; i++) {
        const a = working[i]
        if (a.hp <= 0 || hitEnemyIds.includes(a.id) || !hits(proj, a)) continue
        working[i] = damageAsteroid(a, proj.damage, true)
        hitEnemyIds.push(a.id)
        particles.push(...spawnExplosionParticles(a.pos, 4, '#88ccff'))
        if (hitEnemyIds.length >= maxHits) {
          hitProjectiles.add(proj)
          break
        }
      }
      continue
    }

    if (proj.detonate) {
      const det = proj.detonate
      if (!working.some((a) => a.hp > 0 && hits(proj, a))) continue
      hitProjectiles.add(proj)
      const r2 = det.aoeRadius * det.aoeRadius
      working = working.map((a) => {
        if (a.hp <= 0) return a
        const { x: dx, y: dy } = toroidalDelta(proj.pos, a.pos)
        return dx * dx + dy * dy <= r2 ? damageAsteroid(a, det.blastDamage, true) : a
      })
      particles.push(...spawnExplosionParticles(proj.pos, 10, '#ffaa55'))
      continue
    }

    // Bounce + plain bullet: chip the first asteroid hit, then the round is spent.
    for (let i = 0; i < working.length; i++) {
      const a = working[i]
      if (a.hp <= 0 || !hits(proj, a)) continue
      working[i] = damageAsteroid(a, proj.damage, true)
      hitProjectiles.add(proj)
      particles.push(...spawnExplosionParticles(a.pos, 6, '#cdbba6'))
      break
    }
  }

  return {
    projectiles: projectiles.filter((p) => !hitProjectiles.has(p)),
    asteroids: working.filter((a) => a.hp > 0),
    killedAsteroids: working.filter((a) => a.hp <= 0),
    particles,
  }
}

export type EffectAsteroidResult = {
  asteroids: Asteroid[]
  killedAsteroids: Asteroid[]
  particles: Particle[]
}

// Player abilities + AoE effects damage asteroids the same way they hit enemies
// (gravity wells also pull them in). All player-sourced, so a rock destroyed here
// is loot-eligible. Killed rocks come back for the caller to split + drop loot.
// The neutral Shockwave + wandering well are handled in their own loop passes.
export function applyEffectsToAsteroids(
  effects: ActiveEffect[],
  asteroids: Asteroid[],
  dt: number
): EffectAsteroidResult {
  if (asteroids.length === 0) return { asteroids, killedAsteroids: [], particles: [] }
  let working = asteroids
  const particles: Particle[] = []

  const damageInRadius = (center: Vec2, radius: number, amount: number) => {
    if (amount <= 0) return
    working = working.map((a) =>
      toroidalDistance(a.pos, center) <= radius + a.radius ? damageAsteroid(a, amount, true) : a
    )
  }

  for (const effect of effects) {
    switch (effect.kind) {
      case EffectKind.blackHole:
      case EffectKind.eventHorizon: {
        // Pull every asteroid in range (the same spiral enemies get) and burn it
        // with the well's distance falloff.
        working = working.map((a) => {
          const dist = toroidalDistance(a.pos, effect.pos)
          if (dist > effect.radius) return a
          const moved = impartAsteroidImpulse(a, gravityWellDisplacement(a.pos, effect, dt))
          const ratio = Math.max(0, 1 - dist / effect.radius)
          return damageAsteroid(moved, effect.damage * (0.5 + ratio * 1.5) * dt, true)
        })
        break
      }
      case EffectKind.meteoriteStrike:
      case EffectKind.meteorStrike: {
        // One-time blast on the frame the strike's delay elapses. These effects are
        // read pre-tick (they expire on impact), so detect the crossing with the
        // upcoming (+dt) elapsed — matching the frame enemies take the hit.
        if (effect.elapsed < effect.delay && effect.elapsed + dt >= effect.delay) {
          damageInRadius(effect.pos, effect.aoeRadius, effect.damage)
          particles.push(...spawnExplosionParticles(effect.pos, 6, '#ff6633'))
        }
        break
      }
      case EffectKind.sun:
        damageInRadius(effect.pos, effect.radius, effect.damagePerSec * dt)
        break
      case EffectKind.supernova: {
        const { radius, damagePerSec } = getSupernovaState(effect)
        damageInRadius(effect.pos, radius, damagePerSec * dt)
        break
      }
      case EffectKind.nuclearWaste: {
        // Grow 0→peak over growDuration, then shrink back to 0 — same schedule the
        // zone uses on enemies.
        const radius =
          effect.elapsed < effect.growDuration
            ? effect.peakRadius * (effect.elapsed / effect.growDuration)
            : effect.peakRadius *
              Math.max(
                0,
                1 -
                  (effect.elapsed - effect.growDuration) /
                    Math.max(effect.duration - effect.growDuration, 0.0001)
              )
        damageInRadius(effect.pos, radius, effect.damagePerSec * dt)
        break
      }
      default:
        break
    }
  }

  return {
    asteroids: working.filter((a) => a.hp > 0),
    killedAsteroids: working.filter((a) => a.hp <= 0),
    particles,
  }
}
