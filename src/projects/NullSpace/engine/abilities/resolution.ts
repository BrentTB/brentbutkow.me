import type { Ability, ActiveEffect, Ally, Enemy, GameState, Ship, Vec2 } from '../types'
import { ALLY_FACTORY, CHARM_FACTORY, EFFECT_FACTORY, HOLD_ABILITIES } from './index'

export type AbilityResult = {
  abilities: Ability[]
  newEffects: ActiveEffect[]
  newAllies: Ally[]
  // Enemies that switched sides this frame (Hypnosis / Pied Piper) — the game loop
  // removes them from the enemy list. Silent: not a kill, so no score/drops.
  consumedEnemyIds: string[]
  powerSpent: number
}

export function tryUseAbility(
  abilities: Ability[],
  kind: Ability['kind'],
  targetPos: Vec2,
  currentPower: number,
  ship: Ship,
  enemies: Enemy[] = [],
  allies: Ally[] = []
): {
  abilities: Ability[]
  effects: ActiveEffect[]
  ally: Ally | null
  charmedAllies: Ally[]
  consumedEnemyIds: string[]
  powerSpent: number
} {
  const noop = {
    abilities,
    effects: [] as ActiveEffect[],
    ally: null,
    charmedAllies: [] as Ally[],
    consumedEnemyIds: [] as string[],
    powerSpent: 0,
  }
  const idx = abilities.findIndex((a) => a.kind === kind && a.unlocked && a.cooldownRemaining <= 0)
  if (idx === -1) return noop

  const ability = abilities[idx]
  if (currentPower < ability.powerCost) return noop

  // Charm abilities pick their victims before committing: an empty result (no enemy
  // in reach / already at the cap) spends nothing, like a tap into empty space.
  const charmFactory = CHARM_FACTORY[kind]
  const charm = charmFactory ? charmFactory(targetPos, ability, enemies, allies) : null
  if (charmFactory && (!charm || charm.consumedEnemyIds.length === 0)) return noop

  const updated = abilities.map((a, i) => (i === idx ? { ...a, cooldownRemaining: a.cooldown } : a))

  const effectFactory = EFFECT_FACTORY[kind]
  const effects = effectFactory ? effectFactory(ability, targetPos, ship) : []

  const allyFactory = ALLY_FACTORY[kind]
  const ally = allyFactory ? allyFactory(targetPos, ability) : null

  return {
    abilities: updated,
    effects,
    ally,
    charmedAllies: charm?.allies ?? [],
    consumedEnemyIds: charm?.consumedEnemyIds ?? [],
    powerSpent: ability.powerCost,
  }
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
    return {
      abilities: state.abilities,
      newEffects: [],
      newAllies: [],
      consumedEnemyIds: [],
      powerSpent: 0,
    }
  }

  let abilities = state.abilities
  let remainingPower = state.power
  let totalPowerSpent = 0
  const newEffects: ActiveEffect[] = []
  const newAllies: Ally[] = []
  const consumedEnemyIds: string[] = []
  // Charm abilities read + mutate these across the frame's clicks: shrink the enemy
  // pool as victims are taken, grow the ally pool so the cap holds and the same
  // enemy can't be charmed twice in one frame.
  let enemies = state.enemies
  let allies = state.allies

  for (const click of clicks) {
    const result = tryUseAbility(
      abilities,
      selectedAbility,
      click,
      remainingPower,
      state.ship,
      enemies,
      allies
    )
    abilities = result.abilities
    remainingPower -= result.powerSpent
    totalPowerSpent += result.powerSpent
    newEffects.push(...result.effects)
    if (result.ally) newAllies.push(result.ally)
    if (result.consumedEnemyIds.length > 0) {
      const consumed = new Set(result.consumedEnemyIds)
      enemies = enemies.filter((e) => !consumed.has(e.id))
      allies = [...allies, ...result.charmedAllies]
      newAllies.push(...result.charmedAllies)
      consumedEnemyIds.push(...result.consumedEnemyIds)
    }
  }

  return { abilities, newEffects, newAllies, consumedEnemyIds, powerSpent: totalPowerSpent }
}
