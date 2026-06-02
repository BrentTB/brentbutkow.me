import { METEORITE_STRIKE, METEOR_STRIKE, BLACK_HOLE, ROCKET, SHIELD, SUN } from '../data'
import {
  createMeteoriteEffect,
  createMeteorEffect,
  createBlackHoleEffect,
  createRocketEffect,
  createShieldEffect,
  createSunEffect,
} from './effects'
import { AbilityKind } from './types'
import type { Ability, ActiveEffect, GameState, Ship, Vec2 } from './types'

type EffectFactory = (ability: Ability, targetPos: Vec2, ship: Ship) => ActiveEffect

const EFFECT_FACTORY: Record<AbilityKind, EffectFactory> = {
  [AbilityKind.meteorite]: (ability, pos) =>
    createMeteoriteEffect(pos, ability.damage, ability.aoeRadius, METEORITE_STRIKE.delay),
  [AbilityKind.meteor]: (ability, pos) =>
    createMeteorEffect(pos, ability.damage, ability.aoeRadius, METEOR_STRIKE.delay),
  [AbilityKind.blackHole]: (ability, pos) =>
    createBlackHoleEffect(
      pos,
      ability.aoeRadius,
      BLACK_HOLE.pullStrength,
      ability.damage,
      ability.duration ?? BLACK_HOLE.duration
    ),
  [AbilityKind.rocket]: (ability, pos, ship) =>
    createRocketEffect(ship.pos, pos, ability.damage, ability.aoeRadius, ROCKET.speed),
  [AbilityKind.shield]: (ability, pos) =>
    createShieldEffect(pos, ability.aoeRadius, ability.duration ?? SHIELD.duration),
  [AbilityKind.sun]: (ability, pos) =>
    createSunEffect(pos, ability.aoeRadius, ability.damage, ability.duration ?? SUN.duration),
}

export type AbilityResult = {
  abilities: Ability[]
  newEffects: ActiveEffect[]
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
  effect: ActiveEffect | null
  powerSpent: number
} {
  const idx = abilities.findIndex((a) => a.kind === kind && a.unlocked && a.cooldownRemaining <= 0)
  if (idx === -1) return { abilities, effect: null, powerSpent: 0 }

  const ability = abilities[idx]
  if (currentPower < ability.powerCost) {
    return { abilities, effect: null, powerSpent: 0 }
  }

  const updated = abilities.map((a, i) => (i === idx ? { ...a, cooldownRemaining: a.cooldown } : a))
  const factory = EFFECT_FACTORY[kind]
  const effect = factory(ability, targetPos, ship)

  return { abilities: updated, effect, powerSpent: ability.powerCost }
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
  if (!selectedAbility || clicks.length === 0) {
    return { abilities: state.abilities, newEffects: [], powerSpent: 0 }
  }

  let abilities = state.abilities
  let remainingPower = state.power
  let totalPowerSpent = 0
  const newEffects: ActiveEffect[] = []

  for (const click of clicks) {
    const result = tryUseAbility(abilities, selectedAbility, click, remainingPower, state.ship)
    abilities = result.abilities
    remainingPower -= result.powerSpent
    totalPowerSpent += result.powerSpent
    if (result.effect) newEffects.push(result.effect)
  }

  return { abilities, newEffects, powerSpent: totalPowerSpent }
}
