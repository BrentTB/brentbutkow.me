import { METEORITE_STRIKE, METEOR_STRIKE, BLACK_HOLE } from '../data'
import { uid, spawnExplosionParticles } from './entities'
import { distance } from './collision'
import { AbilityKind } from './types'
import type { Ability, BlackHole, Enemy, GameState, MeteorStrike, Particle, Vec2 } from './types'

export type AbilityResult = {
  abilities: Ability[]
  newStrikes: MeteorStrike[]
  newBlackHoles: BlackHole[]
  powerSpent: number
}

export function tryUseAbility(
  abilities: Ability[],
  kind: Ability['kind'],
  targetPos: Vec2,
  currentPower: number
): {
  abilities: Ability[]
  strike: MeteorStrike | null
  blackHole: BlackHole | null
  powerSpent: number
} {
  const idx = abilities.findIndex((a) => a.kind === kind && a.unlocked && a.cooldownRemaining <= 0)
  if (idx === -1) return { abilities, strike: null, blackHole: null, powerSpent: 0 }

  const ability = abilities[idx]
  if (currentPower < ability.powerCost) {
    return { abilities, strike: null, blackHole: null, powerSpent: 0 }
  }

  const updated = abilities.map((a, i) => (i === idx ? { ...a, cooldownRemaining: a.cooldown } : a))

  if (kind === AbilityKind.blackHole) {
    const blackHole: BlackHole = {
      id: uid(),
      pos: { ...targetPos },
      radius: ability.aoeRadius,
      pullStrength: BLACK_HOLE.pullStrength,
      damage: ability.damage,
      duration: BLACK_HOLE.duration,
      elapsed: 0,
    }
    return { abilities: updated, strike: null, blackHole, powerSpent: ability.powerCost }
  }

  const delayValue = kind === AbilityKind.meteorite ? METEORITE_STRIKE.delay : METEOR_STRIKE.delay

  const strike: MeteorStrike = {
    id: uid(),
    kind,
    targetPos: { ...targetPos },
    delay: delayValue,
    elapsed: 0,
    damage: ability.damage,
    aoeRadius: ability.aoeRadius,
  }

  return { abilities: updated, strike, blackHole: null, powerSpent: ability.powerCost }
}

export function updateAbilityCooldowns(abilities: Ability[], dt: number): Ability[] {
  return abilities.map((a) => ({
    ...a,
    cooldownRemaining: Math.max(0, a.cooldownRemaining - dt),
  }))
}

export function updateMeteorStrikes(
  strikes: MeteorStrike[],
  enemies: Enemy[],
  dt: number
): {
  strikes: MeteorStrike[]
  enemies: Enemy[]
  particles: Particle[]
  scoreGained: number
  powerGained: number
  killedEnemies: Enemy[]
} {
  const remaining: MeteorStrike[] = []
  let updatedEnemies = enemies
  const allParticles: Particle[] = []
  let scoreGained = 0
  let powerGained = 0
  const allKilled: Enemy[] = []

  for (const strike of strikes) {
    const elapsed = strike.elapsed + dt
    if (elapsed < strike.delay) {
      remaining.push({ ...strike, elapsed })
    } else {
      const result = applyMeteorDamage(updatedEnemies, strike)
      updatedEnemies = result.enemies
      scoreGained += result.scoreGained
      powerGained += result.powerGained
      allKilled.push(...result.killedEnemies)
      allParticles.push(...spawnExplosionParticles(strike.targetPos, 16, '#ff6633'))
    }
  }

  return {
    strikes: remaining,
    enemies: updatedEnemies,
    particles: allParticles,
    scoreGained,
    powerGained,
    killedEnemies: allKilled,
  }
}

export function updateBlackHoles(
  holes: BlackHole[],
  enemies: Enemy[],
  dt: number
): {
  blackHoles: BlackHole[]
  enemies: Enemy[]
  particles: Particle[]
  scoreGained: number
  powerGained: number
  killedEnemies: Enemy[]
} {
  const remaining: BlackHole[] = []
  let updatedEnemies = enemies
  const allParticles: Particle[] = []
  let scoreGained = 0
  let powerGained = 0
  const allKilled: Enemy[] = []

  for (const hole of holes) {
    const elapsed = hole.elapsed + dt
    if (elapsed >= hole.duration) continue

    remaining.push({ ...hole, elapsed })

    const result = applyBlackHoleEffect(updatedEnemies, hole, dt)
    updatedEnemies = result.enemies
    scoreGained += result.scoreGained
    powerGained += result.powerGained
    allKilled.push(...result.killedEnemies)
    allParticles.push(...result.particles)
  }

  return {
    blackHoles: remaining,
    enemies: updatedEnemies,
    particles: allParticles,
    scoreGained,
    powerGained,
    killedEnemies: allKilled,
  }
}

function applyBlackHoleEffect(
  enemies: Enemy[],
  hole: BlackHole,
  dt: number
): {
  enemies: Enemy[]
  scoreGained: number
  powerGained: number
  killedEnemies: Enemy[]
  particles: Particle[]
} {
  let scoreGained = 0
  let powerGained = 0
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

    // Strong tangential orbit + gentle radial pull for spiral motion
    const strength = (1 - dist / hole.radius) * hole.pullStrength * dt
    const radial = 0.25
    const tangential = 0.85
    const spiralX = nx * strength * radial - ny * strength * tangential
    const spiralY = ny * strength * radial + nx * strength * tangential

    // Damage scales inversely with distance — more at center
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
      powerGained += enemy.powerReward
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, '#6644cc'))
    } else {
      surviving.push(moved)
    }
  }

  return { enemies: surviving, scoreGained, powerGained, killedEnemies, particles }
}

function applyMeteorDamage(
  enemies: Enemy[],
  strike: MeteorStrike
): { enemies: Enemy[]; scoreGained: number; powerGained: number; killedEnemies: Enemy[] } {
  let scoreGained = 0
  let powerGained = 0
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []

  for (const enemy of enemies) {
    const dist = distance(enemy.pos, strike.targetPos)
    if (dist < strike.aoeRadius) {
      const damaged = { ...enemy, hp: enemy.hp - strike.damage }
      if (damaged.hp <= 0) {
        scoreGained += enemy.scoreValue
        powerGained += enemy.powerReward
        killedEnemies.push(enemy)
      } else {
        surviving.push(damaged)
      }
    } else {
      surviving.push(enemy)
    }
  }

  return { enemies: surviving, scoreGained, powerGained, killedEnemies }
}

export function resolveAbilityInput(
  state: GameState,
  clicks: Vec2[],
  selectedAbility: Ability['kind'] | null
): AbilityResult {
  if (!selectedAbility || clicks.length === 0) {
    return { abilities: state.abilities, newStrikes: [], newBlackHoles: [], powerSpent: 0 }
  }

  let abilities = state.abilities
  let remainingPower = state.power
  let totalPowerSpent = 0
  const newStrikes: MeteorStrike[] = []
  const newBlackHoles: BlackHole[] = []

  for (const click of clicks) {
    const result = tryUseAbility(abilities, selectedAbility, click, remainingPower)
    abilities = result.abilities
    remainingPower -= result.powerSpent
    totalPowerSpent += result.powerSpent
    if (result.strike) newStrikes.push(result.strike)
    if (result.blackHole) newBlackHoles.push(result.blackHole)
  }

  return { abilities, newStrikes, newBlackHoles, powerSpent: totalPowerSpent }
}
