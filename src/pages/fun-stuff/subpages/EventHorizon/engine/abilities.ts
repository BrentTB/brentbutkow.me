import { METEOR_STRIKE } from '../data'
import { uid, spawnExplosionParticles } from './entities'
import { distance } from './collision'
import type { Ability, AbilityKind, Enemy, GameState, MeteorStrike, Particle, Vec2 } from './types'

export function tryUseAbility(
  abilities: Ability[],
  kind: AbilityKind,
  targetPos: Vec2,
  currentPower: number
): { abilities: Ability[]; strike: MeteorStrike | null; powerSpent: number } {
  const idx = abilities.findIndex((a) => a.kind === kind && a.cooldownRemaining <= 0)
  if (idx === -1) return { abilities, strike: null, powerSpent: 0 }

  const ability = abilities[idx]
  if (currentPower < ability.powerCost) return { abilities, strike: null, powerSpent: 0 }

  const updated = abilities.map((a, i) => (i === idx ? { ...a, cooldownRemaining: a.cooldown } : a))

  const strike: MeteorStrike = {
    id: uid(),
    targetPos: { ...targetPos },
    delay: METEOR_STRIKE.delay,
    elapsed: 0,
    damage: METEOR_STRIKE.damage,
    aoeRadius: METEOR_STRIKE.aoeRadius,
  }

  return { abilities: updated, strike, powerSpent: ability.powerCost }
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
} {
  const remaining: MeteorStrike[] = []
  let updatedEnemies = enemies
  const allParticles: Particle[] = []
  let scoreGained = 0
  let powerGained = 0

  for (const strike of strikes) {
    const elapsed = strike.elapsed + dt
    if (elapsed < strike.delay) {
      remaining.push({ ...strike, elapsed })
    } else {
      const result = applyMeteorDamage(updatedEnemies, strike)
      updatedEnemies = result.enemies
      scoreGained += result.scoreGained
      powerGained += result.powerGained
      allParticles.push(...spawnExplosionParticles(strike.targetPos, 16, '#ff6633'))
    }
  }

  return {
    strikes: remaining,
    enemies: updatedEnemies,
    particles: allParticles,
    scoreGained,
    powerGained,
  }
}

function applyMeteorDamage(
  enemies: Enemy[],
  strike: MeteorStrike
): { enemies: Enemy[]; scoreGained: number; powerGained: number } {
  let scoreGained = 0
  let powerGained = 0
  const surviving: Enemy[] = []

  for (const enemy of enemies) {
    const dist = distance(enemy.pos, strike.targetPos)
    if (dist < strike.aoeRadius) {
      const damaged = { ...enemy, hp: enemy.hp - strike.damage }
      if (damaged.hp <= 0) {
        scoreGained += enemy.scoreValue
        powerGained += enemy.powerReward
      } else {
        surviving.push(damaged)
      }
    } else {
      surviving.push(enemy)
    }
  }

  return { enemies: surviving, scoreGained, powerGained }
}

export function resolveAbilityInput(
  state: GameState,
  clicks: Vec2[],
  selectedAbility: AbilityKind | null
): { abilities: Ability[]; newStrikes: MeteorStrike[]; powerSpent: number } {
  if (!selectedAbility || clicks.length === 0) {
    return { abilities: state.abilities, newStrikes: [], powerSpent: 0 }
  }

  let abilities = state.abilities
  let remainingPower = state.power
  let totalPowerSpent = 0
  const newStrikes: MeteorStrike[] = []

  for (const click of clicks) {
    const result = tryUseAbility(abilities, selectedAbility, click, remainingPower)
    abilities = result.abilities
    remainingPower -= result.powerSpent
    totalPowerSpent += result.powerSpent
    if (result.strike) {
      newStrikes.push(result.strike)
    }
  }

  return { abilities, newStrikes, powerSpent: totalPowerSpent }
}
