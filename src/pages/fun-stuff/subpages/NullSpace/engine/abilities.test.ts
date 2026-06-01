import { describe, it, expect, beforeEach } from 'vitest'
import { tryUseAbility, updateAbilityCooldowns } from './abilities'
import { createAbilities, resetUid } from './entities'
import { AbilityKind } from './types'

beforeEach(() => {
  resetUid()
})

describe('tryUseAbility', () => {
  it('creates a meteorite strike when off cooldown and has power', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 100)
    expect(result.strike).not.toBeNull()
    expect(result.strike!.targetPos).toEqual({ x: 100, y: 200 })
    expect(result.strike!.kind).toBe(AbilityKind.meteorite)
    expect(result.abilities[0].cooldownRemaining).toBeGreaterThan(0)
    expect(result.powerSpent).toBe(abilities[0].powerCost)
  })

  it('returns null strike when on cooldown', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 2 }))
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 100)
    expect(result.strike).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('returns null strike when not enough power', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 1)
    expect(result.strike).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('cannot use a locked ability', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, AbilityKind.meteor, { x: 100, y: 200 }, 100)
    expect(result.strike).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('can use meteor when unlocked', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteor ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteor, { x: 50, y: 50 }, 100)
    expect(result.strike).not.toBeNull()
    expect(result.strike!.kind).toBe(AbilityKind.meteor)
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
