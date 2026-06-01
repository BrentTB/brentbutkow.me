import { WAVES_PER_LEVEL, METEORITE_STRIKE, METEOR_STRIKE, SHIP_DEFAULTS } from '../data'
import { AbilityKind, UpgradeCategory, UpgradeId } from './types'
import type { Ability, PlayerUpgrades, Ship, UpgradeDefinition } from './types'

export const UPGRADE_DEFINITIONS: Record<UpgradeId, UpgradeDefinition> = {
  [UpgradeId.unlockMeteor]: {
    id: UpgradeId.unlockMeteor,
    category: UpgradeCategory.weapons,
    weapon: AbilityKind.meteor,
    label: 'Unlock Meteor',
    description: 'Unlock the devastating Meteor strike',
    tiers: [{ cost: 15, value: 1 }],
  },
  [UpgradeId.meteoriteDamage]: {
    id: UpgradeId.meteoriteDamage,
    category: UpgradeCategory.weapons,
    weapon: AbilityKind.meteorite,
    label: 'Damage',
    description: 'Increase meteorite strike damage',
    tiers: [
      { cost: 5, value: 5 },
      { cost: 10, value: 5 },
      { cost: 20, value: 10 },
    ],
  },
  [UpgradeId.meteoriteCostReduction]: {
    id: UpgradeId.meteoriteCostReduction,
    category: UpgradeCategory.weapons,
    weapon: AbilityKind.meteorite,
    label: 'Efficiency',
    description: 'Reduce meteorite power cost',
    tiers: [
      { cost: 8, value: 1 },
      { cost: 16, value: 1 },
    ],
  },
  [UpgradeId.meteorDamage]: {
    id: UpgradeId.meteorDamage,
    category: UpgradeCategory.weapons,
    weapon: AbilityKind.meteor,
    label: 'Damage',
    description: 'Increase meteor strike damage',
    tiers: [
      { cost: 10, value: 10 },
      { cost: 20, value: 15 },
      { cost: 35, value: 20 },
    ],
  },
  [UpgradeId.meteorCostReduction]: {
    id: UpgradeId.meteorCostReduction,
    category: UpgradeCategory.weapons,
    weapon: AbilityKind.meteor,
    label: 'Efficiency',
    description: 'Reduce meteor power cost',
    tiers: [
      { cost: 12, value: 5 },
      { cost: 24, value: 5 },
    ],
  },
  [UpgradeId.shipMaxHp]: {
    id: UpgradeId.shipMaxHp,
    category: UpgradeCategory.ship,
    label: 'Hull Plating',
    description: 'Increase maximum ship HP',
    tiers: [
      { cost: 6, value: 25 },
      { cost: 12, value: 25 },
      { cost: 24, value: 50 },
    ],
  },
  [UpgradeId.shipDamage]: {
    id: UpgradeId.shipDamage,
    category: UpgradeCategory.ship,
    label: 'Auto-Turret',
    description: 'Increase ship auto-attack damage',
    tiers: [
      { cost: 8, value: 2 },
      { cost: 16, value: 3 },
      { cost: 30, value: 5 },
    ],
  },
  [UpgradeId.powerRegen]: {
    id: UpgradeId.powerRegen,
    category: UpgradeCategory.powers,
    label: 'Power Regen',
    description: 'Increase passive power regeneration',
    tiers: [
      { cost: 8, value: 1 },
      { cost: 16, value: 2 },
      { cost: 30, value: 3 },
    ],
  },
}

export const UPGRADE_CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  [UpgradeCategory.weapons]: 'Weapons',
  [UpgradeCategory.ship]: 'Ship',
  [UpgradeCategory.powers]: 'Powers',
}

export function createInitialUpgrades(): PlayerUpgrades {
  const upgrades = {} as PlayerUpgrades
  for (const id of Object.values(UpgradeId)) {
    upgrades[id] = { currentTier: 0 }
  }
  return upgrades
}

export function canPurchaseUpgrade(
  upgrades: PlayerUpgrades,
  upgradeId: UpgradeId,
  currency: number
): boolean {
  const def = UPGRADE_DEFINITIONS[upgradeId]
  const current = upgrades[upgradeId].currentTier
  if (current >= def.tiers.length) return false
  return currency >= def.tiers[current].cost
}

export function purchaseUpgrade(
  upgrades: PlayerUpgrades,
  upgradeId: UpgradeId
): { upgrades: PlayerUpgrades; currencySpent: number } {
  const def = UPGRADE_DEFINITIONS[upgradeId]
  const current = upgrades[upgradeId].currentTier
  const cost = def.tiers[current].cost

  return {
    upgrades: {
      ...upgrades,
      [upgradeId]: { currentTier: current + 1 },
    },
    currencySpent: cost,
  }
}

export function applyUpgradesToAbilities(
  abilities: Ability[],
  upgrades: PlayerUpgrades
): Ability[] {
  return abilities.map((ability) => {
    if (ability.kind === AbilityKind.meteorite) {
      let damage = METEORITE_STRIKE.damage
      let powerCost = METEORITE_STRIKE.powerCost

      const dmgTier = upgrades[UpgradeId.meteoriteDamage].currentTier
      for (let i = 0; i < dmgTier; i++) {
        damage += UPGRADE_DEFINITIONS[UpgradeId.meteoriteDamage].tiers[i].value
      }

      const costTier = upgrades[UpgradeId.meteoriteCostReduction].currentTier
      for (let i = 0; i < costTier; i++) {
        powerCost -= UPGRADE_DEFINITIONS[UpgradeId.meteoriteCostReduction].tiers[i].value
      }

      return { ...ability, damage, powerCost: Math.max(1, powerCost) }
    }

    if (ability.kind === AbilityKind.meteor) {
      const unlocked = upgrades[UpgradeId.unlockMeteor].currentTier > 0
      let damage = METEOR_STRIKE.damage
      let powerCost = METEOR_STRIKE.powerCost

      const dmgTier = upgrades[UpgradeId.meteorDamage].currentTier
      for (let i = 0; i < dmgTier; i++) {
        damage += UPGRADE_DEFINITIONS[UpgradeId.meteorDamage].tiers[i].value
      }

      const costTier = upgrades[UpgradeId.meteorCostReduction].currentTier
      for (let i = 0; i < costTier; i++) {
        powerCost -= UPGRADE_DEFINITIONS[UpgradeId.meteorCostReduction].tiers[i].value
      }

      return { ...ability, unlocked, damage, powerCost: Math.max(1, powerCost) }
    }

    return ability
  })
}

export function applyUpgradesToShip(ship: Ship, upgrades: PlayerUpgrades): Ship {
  let maxHp = SHIP_DEFAULTS.maxHp
  let damage = SHIP_DEFAULTS.damage

  const hpTier = upgrades[UpgradeId.shipMaxHp].currentTier
  for (let i = 0; i < hpTier; i++) {
    maxHp += UPGRADE_DEFINITIONS[UpgradeId.shipMaxHp].tiers[i].value
  }

  const dmgTier = upgrades[UpgradeId.shipDamage].currentTier
  for (let i = 0; i < dmgTier; i++) {
    damage += UPGRADE_DEFINITIONS[UpgradeId.shipDamage].tiers[i].value
  }

  const hpGain = maxHp - ship.maxHp
  return {
    ...ship,
    maxHp,
    hp: Math.min(ship.hp + Math.max(0, hpGain), maxHp),
    damage,
  }
}

export function applyUpgradesToPowerRegen(baseRegen: number, upgrades: PlayerUpgrades): number {
  let regen = baseRegen
  const tier = upgrades[UpgradeId.powerRegen].currentTier
  for (let i = 0; i < tier; i++) {
    regen += UPGRADE_DEFINITIONS[UpgradeId.powerRegen].tiers[i].value
  }
  return regen
}

export function getLevel(wave: number): number {
  if (wave <= 0) return 0
  return Math.ceil(wave / WAVES_PER_LEVEL)
}

export function isUpgradeWave(wave: number): boolean {
  return wave > 0 && wave % WAVES_PER_LEVEL === 0
}
