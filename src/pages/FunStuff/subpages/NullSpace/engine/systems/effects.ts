import { ROCKET } from '../abilities/ability-data'
import { damageEnemiesInRadius, damageEnemiesInRadiusFlat } from '../math/aoe'
import { distance } from '../math/collision'
import { createParticle, spawnExplosionParticles, uid } from '../entities/entity-creator'
import { EffectKind, ProjectileOwner } from '../types'
import type {
  ActiveEffect,
  BlackHoleEffect,
  Enemy,
  MeteorStrikeEffect,
  NuclearWasteEffect,
  Particle,
  Projectile,
  RocketEffect,
  ShieldEffect,
  Ship,
  SunEffect,
} from '../types'

export type EffectTickContext = {
  enemies: Enemy[]
  projectiles: Projectile[]
  ship: Ship
  dt: number
}

export type EffectTickResult = {
  effect: ActiveEffect | null
  enemies: Enemy[]
  projectiles: Projectile[]
  particles: Particle[]
  scoreGained: number
  killedEnemies: Enemy[]
}

type EffectTickFn = (effect: ActiveEffect, ctx: EffectTickContext) => EffectTickResult

const EFFECT_TICK: Record<EffectKind, EffectTickFn> = {
  [EffectKind.meteoriteStrike]: tickMeteorStrike,
  [EffectKind.meteorStrike]: tickMeteorStrike,
  [EffectKind.blackHole]: tickBlackHole,
  [EffectKind.rocket]: tickRocket,
  [EffectKind.shield]: tickShield,
  [EffectKind.sun]: tickSun,
  [EffectKind.nuclearWaste]: tickNuclearWaste,
}

export function updateActiveEffects(
  effects: ActiveEffect[],
  enemies: Enemy[],
  projectiles: Projectile[],
  ship: Ship,
  dt: number
): {
  activeEffects: ActiveEffect[]
  enemies: Enemy[]
  projectiles: Projectile[]
  particles: Particle[]
  scoreGained: number
  killedEnemies: Enemy[]
} {
  const surviving: ActiveEffect[] = []
  const allParticles: Particle[] = []
  const allKilled: Enemy[] = []
  let scoreGained = 0
  let currentEnemies = enemies
  let currentProjectiles = projectiles

  for (const effect of effects) {
    const updated = { ...effect, elapsed: effect.elapsed + dt }
    const tick = EFFECT_TICK[updated.kind]
    const result = tick(updated, {
      enemies: currentEnemies,
      projectiles: currentProjectiles,
      ship,
      dt,
    })

    currentEnemies = result.enemies
    currentProjectiles = result.projectiles
    scoreGained += result.scoreGained
    allKilled.push(...result.killedEnemies)
    allParticles.push(...result.particles)

    if (result.effect) surviving.push(result.effect)
  }

  return {
    activeEffects: surviving,
    enemies: currentEnemies,
    projectiles: currentProjectiles,
    particles: allParticles,
    scoreGained,
    killedEnemies: allKilled,
  }
}

// --- Tick handlers ---

function tickMeteorStrike(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const strike = effect as MeteorStrikeEffect

  if (strike.elapsed < strike.delay) {
    return passThrough(strike, ctx)
  }

  const { enemies, scoreGained, killedEnemies } = applyMeteorDamage(ctx.enemies, strike)
  return {
    effect: null,
    enemies,
    projectiles: ctx.projectiles,
    particles: spawnExplosionParticles(strike.pos, 16, '#ff6633'),
    scoreGained,
    killedEnemies,
  }
}

function tickBlackHole(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const hole = effect as BlackHoleEffect

  if (hole.elapsed >= hole.duration) {
    return passThrough(null, ctx)
  }

  const r = applyBlackHoleEffect(ctx.enemies, hole, ctx.dt)
  return {
    effect: hole,
    enemies: r.enemies,
    projectiles: ctx.projectiles,
    particles: r.particles,
    scoreGained: r.scoreGained,
    killedEnemies: r.killedEnemies,
  }
}

// Radius around the rocket sprite that counts as "contact" with an enemy
// during flight. Decoupled from aoeRadius so the explosion is bigger than
// the rocket-as-projectile collision check.
const ROCKET_HIT_RADIUS = 10

function tickRocket(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const rocket = effect as RocketEffect

  // Fly forward first, then test for contact / arrival from the NEW position.
  const newPos = {
    x: rocket.pos.x + rocket.vel.x * ctx.dt,
    y: rocket.pos.y + rocket.vel.y * ctx.dt,
  }

  let hitContact = false
  for (const enemy of ctx.enemies) {
    const dx = newPos.x - enemy.pos.x
    const dy = newPos.y - enemy.pos.y
    const r = ROCKET_HIT_RADIUS + enemy.radius
    if (dx * dx + dy * dy <= r * r) {
      hitContact = true
      break
    }
  }

  // Arrival detection: elapsed time has reached the planned flight time.
  const reachedTarget = rocket.elapsed >= rocket.duration

  if (hitContact || reachedTarget) {
    // Detonate at the rocket's actual current position so the visual rocket
    // and the AoE always line up.
    const detonatePos = hitContact ? newPos : rocket.targetPos
    const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadiusFlat(
      ctx.enemies,
      detonatePos,
      rocket.aoeRadius,
      rocket.damage
    )
    return {
      effect: null,
      enemies,
      projectiles: ctx.projectiles,
      particles: spawnExplosionParticles(detonatePos, 18, '#ff7733'),
      scoreGained,
      killedEnemies,
    }
  }

  // Emit a trail particle at a steady interval.
  const trailParticles: Particle[] = []
  const trailTimer = rocket.trailTimer - ctx.dt
  if (trailTimer <= 0) {
    trailParticles.push(
      createParticle(
        { x: newPos.x, y: newPos.y },
        { x: -rocket.vel.x * 0.15, y: -rocket.vel.y * 0.15 },
        '#ffaa55',
        0.4,
        3
      )
    )
  }

  return {
    effect: {
      ...rocket,
      pos: newPos,
      trailTimer: trailTimer <= 0 ? ROCKET.trailParticleInterval : trailTimer,
    },
    enemies: ctx.enemies,
    projectiles: ctx.projectiles,
    particles: trailParticles,
    scoreGained: 0,
    killedEnemies: [],
  }
}

function tickShield(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const shield = effect as ShieldEffect

  if (shield.elapsed >= shield.duration) {
    return passThrough(null, ctx)
  }

  // Grandfathered list = enemies that have been inside the shield CONTINUOUSLY
  // since it spawned. The shield only blocks NEW entries — anyone caught
  // inside at spawn time gets to wander out freely, BUT once they leave they
  // can't come back. Recompute the list every tick to enforce that.
  const radiusSq = shield.radius * shield.radius
  const insideThisTick = new Set<string>()
  for (const enemy of ctx.enemies) {
    const dx = enemy.pos.x - shield.pos.x
    const dy = enemy.pos.y - shield.pos.y
    if (dx * dx + dy * dy < radiusSq) insideThisTick.add(enemy.id)
  }
  let grandfathered: string[]
  if (shield.grandfatheredEnemyIds === null) {
    // First tick — everyone currently inside gets grandfathered.
    grandfathered = [...insideThisTick]
  } else {
    // Subsequent ticks — keep only the IDs that are STILL inside. An enemy
    // that has moved outside drops off the list and is treated as a newcomer
    // on any future re-entry attempt.
    grandfathered = shield.grandfatheredEnemyIds.filter((id) => insideThisTick.has(id))
  }

  // Absorb enemy projectiles inside the shield; leave ship projectiles alone.
  // Bullets fired from inside (by grandfathered enemies) are still absorbed.
  const remainingProjectiles: Projectile[] = []
  const absorbParticles: Particle[] = []
  for (const p of ctx.projectiles) {
    if (p.owner === ProjectileOwner.enemy) {
      const dx = p.pos.x - shield.pos.x
      const dy = p.pos.y - shield.pos.y
      if (dx * dx + dy * dy < radiusSq) {
        absorbParticles.push(...spawnExplosionParticles(p.pos, 3, '#88ccff'))
        continue
      }
    }
    remainingProjectiles.push(p)
  }

  return {
    effect: { ...shield, grandfatheredEnemyIds: grandfathered },
    enemies: ctx.enemies,
    projectiles: remainingProjectiles,
    particles: absorbParticles,
    scoreGained: 0,
    killedEnemies: [],
  }
}

function tickSun(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const sun = effect as SunEffect

  if (sun.elapsed >= sun.duration) {
    return passThrough(null, ctx)
  }

  const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadius(
    ctx.enemies,
    sun.pos,
    sun.radius,
    sun.damagePerSec,
    ctx.dt
  )

  return {
    effect: sun,
    enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained,
    killedEnemies,
  }
}

// Current radius of a nuclear-waste zone at `waste.elapsed`. Used by both the
// damage tick and the renderer so the visual and the damage area always match.
// Phase 1 (0 → growDuration): scale 0 → peakRadius.
// Phase 2 (growDuration → duration): linearly shrink peakRadius → 0.
export function getNuclearWasteCurrentRadius(waste: NuclearWasteEffect): number {
  if (waste.elapsed <= 0) return 0
  if (waste.elapsed < waste.growDuration) {
    return waste.peakRadius * (waste.elapsed / waste.growDuration)
  }
  const shrinkSpan = Math.max(waste.duration - waste.growDuration, 0.0001)
  const shrinkProgress = (waste.elapsed - waste.growDuration) / shrinkSpan
  return Math.max(0, waste.peakRadius * (1 - shrinkProgress))
}

function tickNuclearWaste(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const waste = effect as NuclearWasteEffect

  if (waste.elapsed >= waste.duration) {
    return passThrough(null, ctx)
  }

  const currentRadius = getNuclearWasteCurrentRadius(waste)
  const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadius(
    ctx.enemies,
    waste.pos,
    currentRadius,
    waste.damagePerSec,
    ctx.dt
  )

  return {
    effect: waste,
    enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained,
    killedEnemies,
  }
}

function passThrough(effect: ActiveEffect | null, ctx: EffectTickContext): EffectTickResult {
  return {
    effect,
    enemies: ctx.enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained: 0,
    killedEnemies: [],
  }
}

function applyMeteorDamage(
  enemies: Enemy[],
  strike: MeteorStrikeEffect
): { enemies: Enemy[]; scoreGained: number; killedEnemies: Enemy[] } {
  let scoreGained = 0
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []

  for (const enemy of enemies) {
    const dist = distance(enemy.pos, strike.pos)
    if (dist < strike.aoeRadius) {
      const damaged = { ...enemy, hp: enemy.hp - strike.damage }
      if (damaged.hp <= 0) {
        scoreGained += enemy.scoreValue
        killedEnemies.push(enemy)
      } else {
        surviving.push(damaged)
      }
    } else {
      surviving.push(enemy)
    }
  }

  return { enemies: surviving, scoreGained, killedEnemies }
}

function applyBlackHoleEffect(
  enemies: Enemy[],
  hole: BlackHoleEffect,
  dt: number
): {
  enemies: Enemy[]
  scoreGained: number
  killedEnemies: Enemy[]
  particles: Particle[]
} {
  let scoreGained = 0
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []

  for (const enemy of enemies) {
    const dx = hole.pos.x - enemy.pos.x
    const dy = hole.pos.y - enemy.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > hole.radius) {
      surviving.push(enemy)
      continue
    }

    const nx = dist > 1 ? dx / dist : 0
    const ny = dist > 1 ? dy / dist : 0

    const strength = (1 - dist / hole.radius) * hole.pullStrength * dt
    const radial = 0.25
    const tangential = 0.85
    const spiralX = nx * strength * radial - ny * strength * tangential
    const spiralY = ny * strength * radial + nx * strength * tangential

    const distRatio = Math.max(0, 1 - dist / hole.radius)
    const damageThisTick = hole.damage * (0.5 + distRatio * 1.5) * dt

    const moved = {
      ...enemy,
      pos: {
        x: enemy.pos.x + spiralX,
        y: enemy.pos.y + spiralY,
      },
      hp: enemy.hp - damageThisTick,
    }

    if (moved.hp <= 0) {
      scoreGained += enemy.scoreValue
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, '#6644cc'))
    } else {
      surviving.push(moved)
    }
  }

  return { enemies: surviving, scoreGained, killedEnemies, particles }
}

// --- Factories ---

export function createMeteoriteEffect(
  targetPos: { x: number; y: number },
  damage: number,
  aoeRadius: number,
  delay: number
): MeteorStrikeEffect {
  return {
    id: uid(),
    kind: EffectKind.meteoriteStrike,
    pos: { ...targetPos },
    elapsed: 0,
    duration: delay,
    delay,
    damage,
    aoeRadius,
  }
}

export function createMeteorEffect(
  targetPos: { x: number; y: number },
  damage: number,
  aoeRadius: number,
  delay: number
): MeteorStrikeEffect {
  return {
    id: uid(),
    kind: EffectKind.meteorStrike,
    pos: { ...targetPos },
    elapsed: 0,
    duration: delay,
    delay,
    damage,
    aoeRadius,
  }
}

export function createBlackHoleEffect(
  pos: { x: number; y: number },
  radius: number,
  pullStrength: number,
  damage: number,
  duration: number
): BlackHoleEffect {
  return {
    id: uid(),
    kind: EffectKind.blackHole,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    pullStrength,
    damage,
  }
}

export function createRocketEffect(
  shipPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  damage: number,
  aoeRadius: number,
  speed: number
): RocketEffect {
  const dx = targetPos.x - shipPos.x
  const dy = targetPos.y - shipPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const flightTime = dist / speed
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 0
  return {
    id: uid(),
    kind: EffectKind.rocket,
    pos: { ...shipPos },
    elapsed: 0,
    duration: flightTime,
    vel: { x: nx * speed, y: ny * speed },
    targetPos: { ...targetPos },
    damage,
    aoeRadius,
    trailTimer: 0,
  }
}

export function createShieldEffect(
  pos: { x: number; y: number },
  radius: number,
  duration: number
): ShieldEffect {
  return {
    id: uid(),
    kind: EffectKind.shield,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    grandfatheredEnemyIds: null,
  }
}

/**
 * Push non-grandfathered enemies that are inside any active shield out to the
 * edge of that shield. Called AFTER enemy movement so an enemy that just
 * walked into a shield this frame gets bounced back to the boundary.
 *
 * Shape: similar to homing — pure geometry, no allocations on the hot path
 * when no shields are active.
 */
export function applyShieldConstraints(effects: ActiveEffect[], enemies: Enemy[]): Enemy[] {
  let active: ShieldEffect[] | null = null
  for (const e of effects) {
    if (e.kind === EffectKind.shield) {
      if (!active) active = []
      active.push(e)
    }
  }
  if (!active) return enemies

  return enemies.map((enemy) => {
    let pos = enemy.pos
    let vel = enemy.vel
    let bumped = false
    for (const shield of active!) {
      if (shield.grandfatheredEnemyIds?.includes(enemy.id)) continue
      const dx = pos.x - shield.pos.x
      const dy = pos.y - shield.pos.y
      const distSq = dx * dx + dy * dy
      if (distSq < shield.radius * shield.radius) {
        const dist = Math.sqrt(distSq)
        // Outward unit normal from shield center to enemy.
        const nx = dist > 0.01 ? dx / dist : 1
        const ny = dist > 0.01 ? dy / dist : 0
        // Snap to the edge so we never have an enemy genuinely inside the shield.
        pos = {
          x: shield.pos.x + nx * shield.radius,
          y: shield.pos.y + ny * shield.radius,
        }
        // Bounce: reflect the inward velocity component, keep the tangential
        // component. Enemies moving outward (vDotN >= 0) aren't bounced —
        // they're already leaving on their own.
        const vDotN = vel.x * nx + vel.y * ny
        if (vDotN < 0) {
          vel = {
            x: vel.x - 2 * vDotN * nx,
            y: vel.y - 2 * vDotN * ny,
          }
        }
        bumped = true
      }
    }
    return bumped ? { ...enemy, pos, vel } : enemy
  })
}

export function createSunEffect(
  pos: { x: number; y: number },
  radius: number,
  damagePerSec: number,
  duration: number
): SunEffect {
  return {
    id: uid(),
    kind: EffectKind.sun,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    damagePerSec,
  }
}

export function createNuclearWasteEffect(
  pos: { x: number; y: number },
  peakRadius: number,
  damagePerSec: number,
  duration: number,
  growDuration: number
): NuclearWasteEffect {
  return {
    id: uid(),
    kind: EffectKind.nuclearWaste,
    pos: { ...pos },
    elapsed: 0,
    duration,
    peakRadius,
    growDuration,
    damagePerSec,
  }
}
