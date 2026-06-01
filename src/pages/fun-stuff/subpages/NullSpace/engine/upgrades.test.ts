import { describe, it, expect } from 'vitest'
import {
  createInitialUpgrades,
  canPurchaseUpgrade,
  purchaseUpgrade,
  applyUpgradesToAbilities,
  applyUpgradesToPowerRegen,
  getLevel,
  isUpgradeWave,
  UPGRADE_DEFINITIONS,
} from './upgrades'
import { createAbilities } from './entities'
import { AbilityKind, UpgradeId } from './types'

describe('createInitialUpgrades', () => {
  it('all tiers start at 0', () => {
    const upgrades = createInitialUpgrades()
    for (const id of Object.values(UpgradeId)) {
      expect(upgrades[id].currentTier).toBe(0)
    }
  })
})

describe('canPurchaseUpgrade', () => {
  it('returns true with enough currency', () => {
    const upgrades = createInitialUpgrades()
    const cost = UPGRADE_DEFINITIONS[UpgradeId.meteoriteDamage].tiers[0].cost
    expect(canPurchaseUpgrade(upgrades, UpgradeId.meteoriteDamage, cost)).toBe(true)
  })

  it('returns false without enough currency', () => {
    const upgrades = createInitialUpgrades()
    expect(canPurchaseUpgrade(upgrades, UpgradeId.meteoriteDamage, 0)).toBe(false)
  })

  it('returns false when maxed', () => {
    let upgrades = createInitialUpgrades()
    const def = UPGRADE_DEFINITIONS[UpgradeId.unlockMeteor]
    upgrades = { ...upgrades, [UpgradeId.unlockMeteor]: { currentTier: def.tiers.length } }
    expect(canPurchaseUpgrade(upgrades, UpgradeId.unlockMeteor, 999)).toBe(false)
  })
})

describe('purchaseUpgrade', () => {
  it('increments tier and returns cost', () => {
    const upgrades = createInitialUpgrades()
    const { upgrades: updated, currencySpent } = purchaseUpgrade(
      upgrades,
      UpgradeId.meteoriteDamage
    )
    expect(updated[UpgradeId.meteoriteDamage].currentTier).toBe(1)
    expect(currencySpent).toBe(UPGRADE_DEFINITIONS[UpgradeId.meteoriteDamage].tiers[0].cost)
  })
})

describe('applyUpgradesToAbilities', () => {
  it('unlocking meteor sets unlocked to true', () => {
    const abilities = createAbilities()
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.unlockMeteor]: { currentTier: 1 },
    }
    const updated = applyUpgradesToAbilities(abilities, upgrades)
    const meteor = updated.find((a) => a.kind === AbilityKind.meteor)
    expect(meteor!.unlocked).toBe(true)
  })

  it('increases meteorite damage with upgrades', () => {
    const abilities = createAbilities()
    const baseDamage = abilities.find((a) => a.kind === AbilityKind.meteorite)!.damage
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.meteoriteDamage]: { currentTier: 1 },
    }
    const updated = applyUpgradesToAbilities(abilities, upgrades)
    const meteorite = updated.find((a) => a.kind === AbilityKind.meteorite)
    expect(meteorite!.damage).toBeGreaterThan(baseDamage)
  })
})

describe('applyUpgradesToPowerRegen', () => {
  it('increases regen with tiers', () => {
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.powerRegen]: { currentTier: 2 },
    }
    const regen = applyUpgradesToPowerRegen(5, upgrades)
    expect(regen).toBeGreaterThan(5)
  })
})

describe('getLevel', () => {
  it('returns 0 for wave 0', () => {
    expect(getLevel(0)).toBe(0)
  })

  it('returns 1 for waves 1-3', () => {
    expect(getLevel(1)).toBe(1)
    expect(getLevel(3)).toBe(1)
  })

  it('returns 2 for waves 4-6', () => {
    expect(getLevel(4)).toBe(2)
    expect(getLevel(6)).toBe(2)
  })
})

describe('isUpgradeWave', () => {
  it('returns false for wave 0', () => {
    expect(isUpgradeWave(0)).toBe(false)
  })

  it('returns false for non-multiple waves', () => {
    expect(isUpgradeWave(1)).toBe(false)
    expect(isUpgradeWave(2)).toBe(false)
  })

  it('returns true for multiples of 3', () => {
    expect(isUpgradeWave(3)).toBe(true)
    expect(isUpgradeWave(6)).toBe(true)
    expect(isUpgradeWave(9)).toBe(true)
  })
})
