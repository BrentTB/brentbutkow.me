import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyUpgradeToState,
  createInitialState,
  devGrantUltimate,
  devUnlockWeapon,
  rollLevelUpWeaponOffers,
  salvageAbility,
  startGame,
} from './game-loop'
import {
  BASE_ABILITY_CAP,
  UPGRADE_DEFINITIONS,
  countAbilitySlots,
  getAbilityCap,
  getSalvageRefund,
  getWeaponModifierUpgrades,
} from './upgrades'
import { ULTIMATE_DEFINITIONS, WEAPON_UNLOCK_UPGRADE } from './abilities'
import { AbilityKind, ShipKind } from './types'
import { getUnlockedAbilitiesInOrder, selectionAfterSalvage } from '../useNullSpace'

beforeEach(() => {
  localStorage.clear()
})

function ready(): ReturnType<typeof createInitialState> {
  return { ...startGame(createInitialState(), ShipKind.fighter), currency: 100000 }
}

const rocketUnlockId = WEAPON_UNLOCK_UPGRADE[AbilityKind.rocket]!
const rocketModId = getWeaponModifierUpgrades(AbilityKind.rocket)[0].id
const isInHotbar = (state: ReturnType<typeof createInitialState>, kind: AbilityKind) =>
  getUnlockedAbilitiesInOrder(state.abilities, state.ultimatesOwned).some((a) => a.kind === kind)

describe('ability slots + cap', () => {
  it('a fresh run uses one slot (Meteorite) and caps at BASE_ABILITY_CAP', () => {
    const state = ready()
    expect(countAbilitySlots(state.abilities)).toBe(1)
    expect(getAbilityCap()).toBe(BASE_ABILITY_CAP)
  })

  it('offers stop once the cap is reached', () => {
    let state = ready()
    state = devUnlockWeapon(state, AbilityKind.rocket)
    state = devUnlockWeapon(state, AbilityKind.shield)
    state = devUnlockWeapon(state, AbilityKind.meteor)
    expect(countAbilitySlots(state.abilities)).toBe(BASE_ABILITY_CAP)
    expect(rollLevelUpWeaponOffers(state.abilities, getAbilityCap())).toEqual([])
  })

  it('under the cap, offers exclude a named ability for that roll', () => {
    const state = ready()
    const offers = rollLevelUpWeaponOffers(state.abilities, getAbilityCap(), {
      exclude: AbilityKind.rocket,
    })
    expect(offers.length).toBeGreaterThan(0)
    expect(offers).not.toContain(AbilityKind.rocket)
  })
})

describe('getSalvageRefund', () => {
  it('is not reclaimable for a base Meteorite with no upgrades or ultimate', () => {
    expect(getSalvageRefund(ready().upgrades, [], AbilityKind.meteorite).reclaimable).toBe(false)
  })

  it('refunds 50% of the Stardust spent on a line', () => {
    let state = ready()
    state = applyUpgradeToState(state, rocketUnlockId)
    state = applyUpgradeToState(state, rocketModId)
    const spent =
      UPGRADE_DEFINITIONS[rocketUnlockId].tiers[0].cost +
      UPGRADE_DEFINITIONS[rocketModId].tiers[0].cost
    const refund = getSalvageRefund(state.upgrades, state.ultimatesOwned, AbilityKind.rocket)
    expect(refund.stardust).toBe(Math.floor(0.5 * spent))
    expect(refund.spaceMetal).toBe(0)
    expect(refund.singularityShard).toBe(0)
    expect(refund.reclaimable).toBe(true)
  })

  it('refunds premium currencies in full for an owned ultimate', () => {
    let state = ready()
    state = applyUpgradeToState(state, rocketUnlockId)
    state = devGrantUltimate(state, AbilityKind.rocket)
    const ult = ULTIMATE_DEFINITIONS[AbilityKind.rocket]!
    const refund = getSalvageRefund(state.upgrades, state.ultimatesOwned, AbilityKind.rocket)
    expect(refund.spaceMetal).toBe(ult.cost.spaceMetal) // 100%
    expect(refund.singularityShard).toBe(state.ultimatesOwned.length) // marginal shard cost
  })
})

describe('salvageAbility', () => {
  it('removes a non-Meteorite line, frees its slot, refunds 50% Stardust, and re-offers', () => {
    let state = ready()
    state = applyUpgradeToState(state, rocketUnlockId)
    state = applyUpgradeToState(state, rocketModId)
    expect(countAbilitySlots(state.abilities)).toBe(2)
    const refund = getSalvageRefund(state.upgrades, state.ultimatesOwned, AbilityKind.rocket)
    const currencyBefore = state.currency

    state = salvageAbility(state, AbilityKind.rocket)

    const rocket = state.abilities.find((a) => a.kind === AbilityKind.rocket)!
    expect(rocket.unlocked).toBe(false)
    expect(rocket.unlockedAt).toBeNull() // gone from the hotbar (which keys on unlockedAt)
    expect(isInHotbar(state, AbilityKind.rocket)).toBe(false)
    expect(state.upgrades[rocketUnlockId].currentTier).toBe(0)
    expect(state.upgrades[rocketModId].currentTier).toBe(0)
    expect(countAbilitySlots(state.abilities)).toBe(1)
    expect(state.currency).toBe(currencyBefore + refund.stardust)
    expect(state.levelUpWeaponOffers.length).toBeGreaterThan(0)
    expect(state.levelUpWeaponOffers).not.toContain(AbilityKind.rocket)
  })

  it('re-rolls offers only on the first slot-freeing salvage of a shop visit', () => {
    const shieldUnlockId = WEAPON_UNLOCK_UPGRADE[AbilityKind.shield]!
    let state = ready()
    state = applyUpgradeToState(state, rocketUnlockId)
    state = applyUpgradeToState(state, shieldUnlockId)
    expect(state.salvageOfferUsed).toBe(false)

    state = salvageAbility(state, AbilityKind.rocket)
    const offersAfterFirst = state.levelUpWeaponOffers
    expect(state.salvageOfferUsed).toBe(true)
    expect(offersAfterFirst.length).toBeGreaterThan(0)

    // A second slot-freeing salvage in the same shop does NOT re-roll — no fishing.
    state = salvageAbility(state, AbilityKind.shield)
    expect(state.levelUpWeaponOffers).toBe(offersAfterFirst)
  })

  it('refunds an owned ultimate fully in Space Metal + Shards and drops it', () => {
    let state = ready()
    state = applyUpgradeToState(state, rocketUnlockId)
    state = devGrantUltimate(state, AbilityKind.rocket)
    const ult = ULTIMATE_DEFINITIONS[AbilityKind.rocket]!
    const metalBefore = state.spaceMetal
    const shardBefore = state.singularityShard
    const ownedBefore = state.ultimatesOwned.length

    state = salvageAbility(state, AbilityKind.rocket)

    expect(state.ultimatesOwned).not.toContain(ULTIMATE_DEFINITIONS[AbilityKind.rocket]!.kind)
    expect(state.spaceMetal).toBe(metalBefore + ult.cost.spaceMetal)
    expect(state.singularityShard).toBe(shardBefore + ownedBefore)
  })

  it('Meteorite keeps its slot — salvage strips its upgrades but never removes it', () => {
    let state = ready()
    const meteoriteModId = getWeaponModifierUpgrades(AbilityKind.meteorite)[0].id
    state = applyUpgradeToState(state, meteoriteModId)
    state = devGrantUltimate(state, AbilityKind.meteorite) // Comet Shower
    const offersBefore = state.levelUpWeaponOffers

    state = salvageAbility(state, AbilityKind.meteorite)

    const meteorite = state.abilities.find((a) => a.kind === AbilityKind.meteorite)!
    expect(meteorite.unlocked).toBe(true) // still here
    expect(countAbilitySlots(state.abilities)).toBe(1)
    expect(state.upgrades[meteoriteModId].currentTier).toBe(0) // upgrades reclaimed
    expect(state.ultimatesOwned).not.toContain(ULTIMATE_DEFINITIONS[AbilityKind.meteorite]!.kind)
    expect(state.levelUpWeaponOffers).toBe(offersBefore) // no slot freed → no re-roll
  })

  it('is a no-op when the line has nothing to reclaim', () => {
    const state = ready()
    expect(salvageAbility(state, AbilityKind.meteorite)).toBe(state)
  })
})

describe('selectionAfterSalvage', () => {
  it('repoints to the first remaining ability when the salvaged one was selected', () => {
    let state = ready()
    state = applyUpgradeToState(state, rocketUnlockId)
    state = salvageAbility(state, AbilityKind.rocket)
    expect(
      selectionAfterSalvage(
        AbilityKind.rocket,
        AbilityKind.rocket,
        state.abilities,
        state.ultimatesOwned
      )
    ).toBe(AbilityKind.meteorite)
  })

  it('leaves selection alone when a different ability was salvaged', () => {
    const state = ready()
    expect(
      selectionAfterSalvage(
        AbilityKind.meteorite,
        AbilityKind.rocket,
        state.abilities,
        state.ultimatesOwned
      )
    ).toBe(AbilityKind.meteorite)
  })
})
