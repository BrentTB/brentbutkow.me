import type { Ability, ActiveEffect, Ally, GameState, Ship, Vec2 } from '../types'
import { ALLY_FACTORY, EFFECT_FACTORY, HOLD_ABILITIES } from './index'

export type AbilityResult = {
  abilities: Ability[]
  newEffects: ActiveEffect[]
  newAllies: Ally[]
  powerSpent: number
}

export function tryUseAbility(
  abilities: Ability[],
  kind: Ability['kind'],
  targetPos: Vec2,
  currentPower: number,
  ship: Ship
): {
  abilities: Ability[]
  effects: ActiveEffect[]
  ally: Ally | null
  powerSpent: number
} {
  const idx = abilities.findIndex((a) => a.kind === kind && a.unlocked && a.cooldownRemaining <= 0)
  if (idx === -1) return { abilities, effects: [], ally: null, powerSpent: 0 }

  const ability = abilities[idx]
  if (currentPower < ability.powerCost) {
    return { abilities, effects: [], ally: null, powerSpent: 0 }
  }

  const updated = abilities.map((a, i) => (i === idx ? { ...a, cooldownRemaining: a.cooldown } : a))

  const effectFactory = EFFECT_FACTORY[kind]
  const effects = effectFactory ? effectFactory(ability, targetPos, ship) : []

  const allyFactory = ALLY_FACTORY[kind]
  const ally = allyFactory ? allyFactory(targetPos, ability) : null

  return { abilities: updated, effects, ally, powerSpent: ability.powerCost }
}

export function updateAbilityCooldowns(abilities: Ability[], dt: number): Ability[] {
  return abilities.map((a) => ({
    ...a,
    cooldownRemaining: Math.max(0, a.cooldownRemaining - dt),
  }))
}

export function resolveAbilityInput(
  state: GameState,
  clicks: Vec2[],
  selectedAbility: Ability['kind'] | null
): AbilityResult {
  if (!selectedAbility || clicks.length === 0 || HOLD_ABILITIES.has(selectedAbility)) {
    return { abilities: state.abilities, newEffects: [], newAllies: [], powerSpent: 0 }
  }

  let abilities = state.abilities
  let remainingPower = state.power
  let totalPowerSpent = 0
  const newEffects: ActiveEffect[] = []
  const newAllies: Ally[] = []

  for (const click of clicks) {
    const result = tryUseAbility(abilities, selectedAbility, click, remainingPower, state.ship)
    abilities = result.abilities
    remainingPower -= result.powerSpent
    totalPowerSpent += result.powerSpent
    newEffects.push(...result.effects)
    if (result.ally) newAllies.push(result.ally)
  }

  return { abilities, newEffects, newAllies, powerSpent: totalPowerSpent }
}
