import { describe, it, expect } from 'vitest'
import { orderWeaponsForShop } from './weapons-list-order'
import { createAbilities } from '../../engine/abilities'
import { AbilityKind } from '../../engine/types'

function setAbility(
  abilities: ReturnType<typeof createAbilities>,
  kind: AbilityKind,
  patch: { unlocked?: boolean; unlockedAt?: number | null }
) {
  return abilities.map((a) => (a.kind === kind ? { ...a, ...patch } : a))
}

describe('orderWeaponsForShop', () => {
  it('lists unlocked weapons by unlockedAt, then offered-locked', () => {
    let abilities = createAbilities()
    abilities = setAbility(abilities, AbilityKind.meteorite, { unlocked: true, unlockedAt: 0 })
    abilities = setAbility(abilities, AbilityKind.blackHole, { unlocked: true, unlockedAt: 1 })
    abilities = setAbility(abilities, AbilityKind.rocket, { unlocked: true, unlockedAt: 2 })

    const order = orderWeaponsForShop(abilities, [AbilityKind.sun, AbilityKind.shield])
    // First three: unlocked in unlockedAt order
    expect(order.slice(0, 3)).toEqual([
      AbilityKind.meteorite,
      AbilityKind.blackHole,
      AbilityKind.rocket,
    ])
    // Tail: offered-locked
    expect(order.slice(3).sort()).toEqual([AbilityKind.shield, AbilityKind.sun].sort())
  })

  it('hides locked weapons that are not offered', () => {
    let abilities = createAbilities()
    abilities = setAbility(abilities, AbilityKind.meteorite, { unlocked: true, unlockedAt: 0 })
    const order = orderWeaponsForShop(abilities, [])
    expect(order).toEqual([AbilityKind.meteorite])
  })

  it('puts offered-locked weapons after unlocked ones (regression: shop ordering)', () => {
    let abilities = createAbilities()
    abilities = setAbility(abilities, AbilityKind.meteorite, { unlocked: true, unlockedAt: 0 })
    abilities = setAbility(abilities, AbilityKind.telekinesis, { unlocked: true, unlockedAt: 1 })

    const order = orderWeaponsForShop(abilities, [AbilityKind.meteor])
    // meteor is canonically BEFORE telekinesis in WEAPON_ORDER, but it's
    // offered-locked, so it must come AFTER both unlocked weapons.
    expect(order.indexOf(AbilityKind.meteor)).toBeGreaterThan(
      order.indexOf(AbilityKind.telekinesis)
    )
  })

  it('replaces a base with its owned ultimate (base hidden, ultimate shown)', () => {
    let abilities = createAbilities()
    abilities = setAbility(abilities, AbilityKind.meteorite, { unlocked: true, unlockedAt: 0 })
    // Owning the ultimate makes its row unlocked, inheriting the base's slot.
    abilities = setAbility(abilities, AbilityKind.cometShower, { unlocked: true, unlockedAt: 0 })
    const order = orderWeaponsForShop(abilities, [], [AbilityKind.cometShower])
    expect(order).toContain(AbilityKind.cometShower)
    expect(order).not.toContain(AbilityKind.meteorite)
  })
})
