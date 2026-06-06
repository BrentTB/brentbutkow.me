import { describe, it, expect, beforeEach } from 'vitest'
import { tryUseAbility, updateAbilityCooldowns } from '.'
import { createAbilities, createShip, resetUid } from '../entities/entity-creator'
import { AbilityKind, EffectKind, ShipKind } from '../types'
import { WORLD_SIZE } from '../../data'

const ship = createShip(ShipKind.fighter, WORLD_SIZE)

beforeEach(() => {
  resetUid()
})

describe('tryUseAbility', () => {
  it('creates a meteorite effect when off cooldown and has power', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteorite ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 100, ship)
    expect(result.effect).not.toBeNull()
    expect(result.effect!.pos).toEqual({ x: 100, y: 200 })
    expect(result.effect!.kind).toBe(EffectKind.meteoriteStrike)
    const meteoriteIdx = abilities.findIndex((a) => a.kind === AbilityKind.meteorite)
    expect(result.abilities[meteoriteIdx].cooldownRemaining).toBeGreaterThan(0)
    expect(result.powerSpent).toBe(abilities[meteoriteIdx].powerCost)
  })

  it('returns null effect when on cooldown', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 2 }))
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 100, ship)
    expect(result.effect).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('returns null effect when not enough power', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 1, ship)
    expect(result.effect).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('cannot use a locked ability', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteor ? { ...a, unlocked: false } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteor, { x: 100, y: 200 }, 100, ship)
    expect(result.effect).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('can use meteor when unlocked', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteor ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteor, { x: 50, y: 50 }, 100, ship)
    expect(result.effect).not.toBeNull()
    expect(result.effect!.kind).toBe(EffectKind.meteorStrike)
    expect(result.powerSpent).toBeGreaterThan(0)
  })

  it('creates a black hole effect when unlocked', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.blackHole ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.blackHole, { x: 300, y: 400 }, 200, ship)
    expect(result.effect).not.toBeNull()
    expect(result.effect!.kind).toBe(EffectKind.blackHole)
    expect(result.powerSpent).toBeGreaterThan(0)
  })
})

describe('updateAbilityCooldowns', () => {
  it('reduces cooldowns by dt', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 2 }))
    const updated = updateAbilityCooldowns(abilities, 0.5)
    expect(updated[0].cooldownRemaining).toBe(1.5)
  })

  it('clamps cooldown at zero', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 0.1 }))
    const updated = updateAbilityCooldowns(abilities, 1)
    expect(updated[0].cooldownRemaining).toBe(0)
  })
})
