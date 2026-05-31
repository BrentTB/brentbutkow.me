import { describe, it, expect, beforeEach } from 'vitest'
import { tryUseAbility, updateAbilityCooldowns } from './abilities'
import { createAbilities, resetUid } from './entities'

beforeEach(() => {
  resetUid()
})

describe('tryUseAbility', () => {
  it('creates a meteor strike when off cooldown and has power', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, 'meteorStrike', { x: 100, y: 200 }, 100)
    expect(result.strike).not.toBeNull()
    expect(result.strike!.targetPos).toEqual({ x: 100, y: 200 })
    expect(result.abilities[0].cooldownRemaining).toBeGreaterThan(0)
    expect(result.powerSpent).toBe(abilities[0].powerCost)
  })

  it('returns null strike when on cooldown', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 2 }))
    const result = tryUseAbility(abilities, 'meteorStrike', { x: 100, y: 200 }, 100)
    expect(result.strike).toBeNull()
    expect(result.powerSpent).toBe(0)
  })

  it('returns null strike when not enough power', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, 'meteorStrike', { x: 100, y: 200 }, 1)
    expect(result.strike).toBeNull()
    expect(result.powerSpent).toBe(0)
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
