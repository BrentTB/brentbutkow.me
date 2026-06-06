import { describe, it, expect } from 'vitest'
import { WAVES_PER_LEVEL } from '../data'
import {
  createInitialUpgrades,
  canPurchaseUpgrade,
  purchaseUpgrade,
  applyUpgradesToAbilities,
  applyUpgradesToPowerRegen,
  getLevel,
  isUpgradeWave,
  UPGRADE_DEFINITIONS,
  WEAPON_UNLOCK_UPGRADE,
} from './upgrades'
import { createAbilities } from './entities/entity-creator'
import { AbilityKind, UpgradeCategory, UpgradeId } from './types'

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

  it('increases black hole duration with upgrades', () => {
    const abilities = createAbilities()
    const baseDuration = abilities.find((a) => a.kind === AbilityKind.blackHole)!.duration
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.blackHoleDuration]: { currentTier: 1 },
    }
    const updated = applyUpgradesToAbilities(abilities, upgrades)
    const blackHole = updated.find((a) => a.kind === AbilityKind.blackHole)
    expect(blackHole!.duration).toBeGreaterThan(baseDuration!)
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

  it('returns correct level for first wave group', () => {
    expect(getLevel(1)).toBe(1)
    expect(getLevel(WAVES_PER_LEVEL)).toBe(1)
  })

  it('returns correct level for second wave group', () => {
    expect(getLevel(WAVES_PER_LEVEL + 1)).toBe(2)
    expect(getLevel(WAVES_PER_LEVEL * 2)).toBe(2)
  })
})

describe('isUpgradeWave', () => {
  it('returns false for wave 0', () => {
    expect(isUpgradeWave(0)).toBe(false)
  })

  it('returns true for multiples of WAVES_PER_LEVEL', () => {
    expect(isUpgradeWave(WAVES_PER_LEVEL)).toBe(true)
    expect(isUpgradeWave(WAVES_PER_LEVEL * 2)).toBe(true)
    expect(isUpgradeWave(WAVES_PER_LEVEL * 3)).toBe(true)
  })
})

describe('WEAPON_UNLOCK_UPGRADE', () => {
  it('every mapped UpgradeId exists in UPGRADE_DEFINITIONS and is a weapons unlock', () => {
    for (const [weapon, upgradeId] of Object.entries(WEAPON_UNLOCK_UPGRADE)) {
      if (!upgradeId) continue
      const def = UPGRADE_DEFINITIONS[upgradeId]
      expect(def).toBeDefined()
      expect(def.category).toBe(UpgradeCategory.weapons)
      expect(def.weapon).toBe(weapon)
    }
  })

  it('every ability except meteorite has an unlock entry', () => {
    for (const kind of Object.values(AbilityKind)) {
      if (kind === AbilityKind.meteorite) continue
      expect(WEAPON_UNLOCK_UPGRADE[kind]).toBeDefined()
    }
  })
})

describe('applyUpgradesToAbilities — new abilities', () => {
  it('rocket damage stacks across tiers', () => {
    let upgrades = createInitialUpgrades()
    const baseRocket = createAbilities().find((a) => a.kind === AbilityKind.rocket)
    if (!baseRocket) throw new Error('rocket not in createAbilities')

    const tiers = UPGRADE_DEFINITIONS[UpgradeId.rocketDamage].tiers
    for (let i = 0; i < tiers.length; i++) {
      upgrades = { ...upgrades, [UpgradeId.rocketDamage]: { currentTier: i + 1 } }
    }
    const upgraded = applyUpgradesToAbilities([baseRocket], upgrades)
    const totalGain = tiers.reduce((s, t) => s + t.value, 0)
    expect(upgraded[0].damage).toBe(baseRocket.damage + totalGain)
  })

  it('unlockRocket flips rocket.unlocked', () => {
    const baseRocket = createAbilities().find((a) => a.kind === AbilityKind.rocket)
    if (!baseRocket) throw new Error('rocket not in createAbilities')

    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.unlockRocket]: { currentTier: 1 },
    }
    const upgraded = applyUpgradesToAbilities([baseRocket], upgrades)
    expect(upgraded[0].unlocked).toBe(true)
  })

  it('shield duration stacks; unlockShield flips unlocked', () => {
    const baseShield = createAbilities().find((a) => a.kind === AbilityKind.shield)
    if (!baseShield) throw new Error('shield not in createAbilities')

    const tiers = UPGRADE_DEFINITIONS[UpgradeId.shieldDuration].tiers
    const totalGain = tiers.reduce((s, t) => s + t.value, 0)
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.unlockShield]: { currentTier: 1 },
      [UpgradeId.shieldDuration]: { currentTier: tiers.length },
    }
    const upgraded = applyUpgradesToAbilities([baseShield], upgrades)
    expect(upgraded[0].unlocked).toBe(true)
    expect(upgraded[0].duration).toBe((baseShield.duration ?? 0) + totalGain)
  })

  it('sun damage + duration stack; unlockSun flips unlocked', () => {
    const baseSun = createAbilities().find((a) => a.kind === AbilityKind.sun)
    if (!baseSun) throw new Error('sun not in createAbilities')

    const dmgTiers = UPGRADE_DEFINITIONS[UpgradeId.sunDamage].tiers
    const dmgGain = dmgTiers.reduce((s, t) => s + t.value, 0)
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.unlockSun]: { currentTier: 1 },
      [UpgradeId.sunDamage]: { currentTier: dmgTiers.length },
    }
    const upgraded = applyUpgradesToAbilities([baseSun], upgrades)
    expect(upgraded[0].unlocked).toBe(true)
    expect(upgraded[0].damage).toBe(baseSun.damage + dmgGain)
  })
})
