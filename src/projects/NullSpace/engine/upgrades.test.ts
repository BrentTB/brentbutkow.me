import { describe, it, expect } from 'vitest'
import { WAVES_PER_LEVEL, WORLD_SIZE } from '../data'
import {
  createInitialUpgrades,
  canPurchaseUpgrade,
  purchaseUpgrade,
  applyUpgradesToAbilities,
  applyUpgradesToPowerRegen,
  applyUpgradesToShip,
  getLevel,
  getPowerOrbMultiplier,
  getSpaceMetalDropMultiplier,
  getStardustMultiplier,
  getAllyWeaponUnlocks,
  getWeaponModifierUpgrades,
  isUpgradeWave,
  isWeaponFullyMaxed,
  syncUltimateAbilities,
  UPGRADE_DEFINITIONS,
  UNLOCK_UPGRADE_IDS,
} from './upgrades'
import { createShip } from './entities/entity-creator'
import { BASE_KIND_OF, WEAPON_UNLOCK_UPGRADE, createAbilities } from './abilities'
import { AbilityKind, ShipKind, UpgradeCategory } from './types'
import { UpgradeId } from './upgrade-ids'

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

describe('syncUltimateAbilities', () => {
  const baseOf = AbilityKind.meteorite // base of cometShower
  const ultimate = AbilityKind.cometShower

  it('an owned ultimate becomes unlocked and inherits its base hotbar slot', () => {
    expect(BASE_KIND_OF[ultimate]).toBe(baseOf)
    const abilities = createAbilities().map((a) =>
      a.kind === baseOf ? { ...a, unlocked: true, unlockedAt: 3 } : a
    )
    const synced = syncUltimateAbilities(abilities, [ultimate])
    const row = synced.find((a) => a.kind === ultimate)!
    expect(row.unlocked).toBe(true)
    expect(row.unlockedAt).toBe(3)
  })

  it('an unowned ultimate is forced back to locked', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === ultimate ? { ...a, unlocked: true, unlockedAt: 2 } : a
    )
    const synced = syncUltimateAbilities(abilities, [])
    const row = synced.find((a) => a.kind === ultimate)!
    expect(row.unlocked).toBe(false)
    expect(row.unlockedAt).toBeNull()
  })

  it('leaves non-ultimate (base) rows untouched by reference', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === baseOf ? { ...a, unlocked: true, unlockedAt: 0 } : a
    )
    const synced = syncUltimateAbilities(abilities, [ultimate])
    const before = abilities.find((a) => a.kind === baseOf)
    const after = synced.find((a) => a.kind === baseOf)
    expect(after).toBe(before)
  })

  it('returns an already-locked unowned ultimate by reference (idempotent)', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === ultimate ? { ...a, unlocked: false, unlockedAt: null } : a
    )
    const synced = syncUltimateAbilities(abilities, [])
    const before = abilities.find((a) => a.kind === ultimate)
    const after = synced.find((a) => a.kind === ultimate)
    expect(after).toBe(before)
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

  it('every base ability except meteorite has an unlock entry', () => {
    for (const kind of Object.values(AbilityKind)) {
      if (kind === AbilityKind.meteorite) continue
      // Ultimates are bought via the shard economy, not a tier-shop unlock.
      if (BASE_KIND_OF[kind] !== undefined) continue
      expect(WEAPON_UNLOCK_UPGRADE[kind]).toBeDefined()
    }
  })
})

describe('getAllyWeaponUnlocks', () => {
  it('shows the four helper-weapon unlocks for the Helper and its Helper Factory ultimate', () => {
    expect(getAllyWeaponUnlocks(AbilityKind.helper).length).toBe(4)
    // Regression: buying the ultimate swaps the detail to Helper Factory, which
    // inherits the Helper line — the ally-weapon unlocks must NOT disappear.
    expect(getAllyWeaponUnlocks(AbilityKind.helperFactory).length).toBe(4)
  })

  it('shows nothing for abilities outside the Helper line', () => {
    expect(getAllyWeaponUnlocks(AbilityKind.meteorite)).toEqual([])
    expect(getAllyWeaponUnlocks(AbilityKind.sun)).toEqual([])
  })
})

describe('getWeaponModifierUpgrades', () => {
  // Regression: after an ultimate replaced its base, the base's upgrades vanished
  // from the shop. The ultimate's detail must surface its base modifiers (which
  // it inherits) plus its own.
  it('an ultimate shows its base modifiers AND its own', () => {
    const ids = getWeaponModifierUpgrades(AbilityKind.cometShower).map((d) => d.id)
    expect(ids).toContain(UpgradeId.meteoriteDamage)
    expect(ids).toContain(UpgradeId.meteoriteCostReduction)
    expect(ids).toContain(UpgradeId.cometShowerCount)
  })

  it('a base ability does NOT show its ultimate-only upgrades', () => {
    const ids = getWeaponModifierUpgrades(AbilityKind.meteorite).map((d) => d.id)
    expect(ids).toContain(UpgradeId.meteoriteDamage)
    expect(ids).not.toContain(UpgradeId.cometShowerCount)
  })

  it('excludes unlock upgrades', () => {
    const ids = getWeaponModifierUpgrades(AbilityKind.meteor).map((d) => d.id)
    expect(ids).not.toContain(UpgradeId.unlockMeteor)
  })
})

describe('Life Regen upgrade', () => {
  it('ship hpRegen is 0 with no upgrades and rises per tier', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const upgrades = createInitialUpgrades()
    expect(applyUpgradesToShip(ship, upgrades).hpRegen).toBe(0)
    upgrades[UpgradeId.lifeRegen] = { currentTier: 1 }
    expect(applyUpgradesToShip(ship, upgrades).hpRegen).toBe(1)
  })
})

describe('isWeaponFullyMaxed', () => {
  // Max every modifier returned by getWeaponModifierUpgrades for a weapon.
  function maxAll(weapon: AbilityKind) {
    let upgrades = createInitialUpgrades()
    for (const def of getWeaponModifierUpgrades(weapon)) {
      upgrades = { ...upgrades, [def.id]: { currentTier: def.tiers.length } }
    }
    return upgrades
  }

  it('false when no modifier upgrades purchased', () => {
    expect(isWeaponFullyMaxed(AbilityKind.rocket, createInitialUpgrades())).toBe(false)
  })

  it('true when every modifier upgrade for a weapon with no further ultimate is at max tier', () => {
    // Every base now offers an ultimate, so the "nothing left to buy" case is an
    // ultimate ability itself (it has no ultimate of its own).
    expect(isWeaponFullyMaxed(AbilityKind.cometShower, maxAll(AbilityKind.cometShower))).toBe(true)
  })

  it('false when one modifier still has room to grow', () => {
    let upgrades = createInitialUpgrades()
    const modifiers = getWeaponModifierUpgrades(AbilityKind.blackHole)
    for (let i = 1; i < modifiers.length; i++) {
      upgrades = { ...upgrades, [modifiers[i].id]: { currentTier: modifiers[i].tiers.length } }
    }
    expect(isWeaponFullyMaxed(AbilityKind.blackHole, upgrades)).toBe(false)
  })

  it('ignores the unlock upgrade — a freshly-unlocked weapon is not "maxed"', () => {
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.unlockBlackHole]: { currentTier: 1 },
    }
    expect(isWeaponFullyMaxed(AbilityKind.blackHole, upgrades)).toBe(false)
  })

  // Regression: maxing a base ability's normal upgrades used to show MAX even
  // though its ultimate was still available to buy.
  it('a base ability with an unpurchased ultimate is never MAX', () => {
    expect(isWeaponFullyMaxed(AbilityKind.meteorite, maxAll(AbilityKind.meteorite))).toBe(false)
  })

  it('an owned ultimate is MAX once its own + inherited base modifiers are maxed', () => {
    expect(isWeaponFullyMaxed(AbilityKind.cometShower, maxAll(AbilityKind.cometShower))).toBe(true)
  })
})

describe('economy multipliers', () => {
  it('stardust multiplier is 1 by default and rises with tiers', () => {
    const upgrades = createInitialUpgrades()
    expect(getStardustMultiplier(upgrades)).toBe(1)
    upgrades[UpgradeId.stardustMultiplier] = { currentTier: 1 }
    expect(getStardustMultiplier(upgrades)).toBeCloseTo(1.25, 5)
  })

  it('space metal drop multiplier is 1 by default and rises with tiers', () => {
    const upgrades = createInitialUpgrades()
    expect(getSpaceMetalDropMultiplier(upgrades)).toBe(1)
    upgrades[UpgradeId.spaceMetalChance] = { currentTier: 1 }
    expect(getSpaceMetalDropMultiplier(upgrades)).toBeCloseTo(1.5, 5)
  })

  it('power-per-kill multiplier is 1 by default and rises with tiers', () => {
    const upgrades = createInitialUpgrades()
    expect(getPowerOrbMultiplier(upgrades)).toBe(1)
    upgrades[UpgradeId.powerPerKill] = { currentTier: 1 }
    expect(getPowerOrbMultiplier(upgrades)).toBeCloseTo(1.25, 5)
  })
})

describe('UNLOCK_UPGRADE_IDS', () => {
  it('contains every weapon unlock id and no modifier ids', () => {
    for (const id of Object.values(WEAPON_UNLOCK_UPGRADE)) {
      if (!id) continue
      expect(UNLOCK_UPGRADE_IDS.has(id)).toBe(true)
    }
    expect(UNLOCK_UPGRADE_IDS.has(UpgradeId.meteoriteDamage)).toBe(false)
    expect(UNLOCK_UPGRADE_IDS.has(UpgradeId.shipMaxHp)).toBe(false)
  })
})

describe('telekinesis force upgrade', () => {
  it('purchasing telekinesisForce increases ability.force', () => {
    const baseTk = createAbilities().find((a) => a.kind === AbilityKind.telekinesis)
    if (!baseTk) throw new Error('telekinesis not in createAbilities')

    const tiers = UPGRADE_DEFINITIONS[UpgradeId.telekinesisForce].tiers
    const totalGain = tiers.reduce((s, t) => s + t.value, 0)
    const upgrades = {
      ...createInitialUpgrades(),
      [UpgradeId.unlockTelekinesis]: { currentTier: 1 },
      [UpgradeId.telekinesisForce]: { currentTier: tiers.length },
    }
    const upgraded = applyUpgradesToAbilities([baseTk], upgrades)
    expect(upgraded[0].force).toBe((baseTk.force ?? 0) + totalGain)
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
