import { distance } from './collision'
import { uid, spawnExplosionParticles } from './entities'
import { EffectKind } from './types'
import type {
  ActiveEffect,
  BlackHoleEffect,
  Enemy,
  MeteorStrikeEffect,
  Particle,
  Ship,
} from './types'

export type EffectTickContext = {
  enemies: Enemy[]
  ship: Ship
  dt: number
}

export type EffectTickResult = {
  effect: ActiveEffect | null
  enemies: Enemy[]
  particles: Particle[]
  scoreGained: number
  killedEnemies: Enemy[]
}

type EffectTickFn = (effect: ActiveEffect, ctx: EffectTickContext) => EffectTickResult

const EFFECT_TICK: Record<EffectKind, EffectTickFn> = {
  [EffectKind.meteoriteStrike]: tickMeteorStrike,
  [EffectKind.meteorStrike]: tickMeteorStrike,
  [EffectKind.blackHole]: tickBlackHole,
}

export function updateActiveEffects(
  effects: ActiveEffect[],
  enemies: Enemy[],
  ship: Ship,
  dt: number
): {
  activeEffects: ActiveEffect[]
  enemies: Enemy[]
  particles: Particle[]
  scoreGained: number
  killedEnemies: Enemy[]
} {
  const surviving: ActiveEffect[] = []
  const allParticles: Particle[] = []
  const allKilled: Enemy[] = []
  let scoreGained = 0
  let currentEnemies = enemies

  for (const effect of effects) {
    const updated = { ...effect, elapsed: effect.elapsed + dt }
    const tick = EFFECT_TICK[updated.kind]
    const result = tick(updated, { enemies: currentEnemies, ship, dt })

    currentEnemies = result.enemies
    scoreGained += result.scoreGained
    allKilled.push(...result.killedEnemies)
    allParticles.push(...result.particles)

    if (result.effect) surviving.push(result.effect)
  }

  return {
    activeEffects: surviving,
    enemies: currentEnemies,
    particles: allParticles,
    scoreGained,
    killedEnemies: allKilled,
  }
}

function tickMeteorStrike(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const strike = effect as MeteorStrikeEffect

  if (strike.elapsed < strike.delay) {
    return {
      effect: strike,
      enemies: ctx.enemies,
      particles: [],
      scoreGained: 0,
      killedEnemies: [],
    }
  }

  const { enemies, scoreGained, killedEnemies } = applyMeteorDamage(ctx.enemies, strike)
  const particles = spawnExplosionParticles(strike.pos, 16, '#ff6633')

  return {
    effect: null,
    enemies,
    particles,
    scoreGained,
    killedEnemies,
  }
}

function tickBlackHole(effect: ActiveEffect, ctx: EffectTickContext): EffectTickResult {
  const hole = effect as BlackHoleEffect

  if (hole.elapsed >= hole.duration) {
    return {
      effect: null,
      enemies: ctx.enemies,
      particles: [],
      scoreGained: 0,
      killedEnemies: [],
    }
  }

  const result = applyBlackHoleEffect(ctx.enemies, hole, ctx.dt)

  return {
    effect: hole,
    enemies: result.enemies,
    particles: result.particles,
    scoreGained: result.scoreGained,
    killedEnemies: result.killedEnemies,
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
