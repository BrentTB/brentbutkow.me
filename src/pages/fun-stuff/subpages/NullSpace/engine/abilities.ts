import { METEORITE_STRIKE, METEOR_STRIKE } from '../data'
import { uid, spawnExplosionParticles } from './entities'
import { distance } from './collision'
import { AbilityKind } from './types'
import type { Ability, Enemy, GameState, MeteorStrike, Particle, Vec2 } from './types'

export function tryUseAbility(
  abilities: Ability[],
  kind: Ability['kind'],
  targetPos: Vec2,
  currentPower: number
): { abilities: Ability[]; strike: MeteorStrike | null; powerSpent: number } {
  const idx = abilities.findIndex((a) => a.kind === kind && a.unlocked && a.cooldownRemaining <= 0)
  if (idx === -1) return { abilities, strike: null, powerSpent: 0 }

  const ability = abilities[idx]
  if (currentPower < ability.powerCost) return { abilities, strike: null, powerSpent: 0 }

  const updated = abilities.map((a, i) => (i === idx ? { ...a, cooldownRemaining: a.cooldown } : a))

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
  dt: number,
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
