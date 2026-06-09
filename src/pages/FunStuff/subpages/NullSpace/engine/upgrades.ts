import { SLINGSHOT, WAVES_PER_LEVEL } from '../data'
import {
  ABILITY_DEFINITIONS,
  ABILITY_UPGRADE_DEFINITIONS,
  WEAPON_UNLOCK_UPGRADE,
  applyTierSum,
} from './abilities'
import { SHIP_WEAPON_UNLOCK_UPGRADE, SHIP_WEAPON_UPGRADE_DEFINITIONS } from './ship'
import { SHIP_VARIANTS } from './ship/ship-data'
import { UpgradeCategory, UpgradeId } from './types'
import type {
  Ability,
  AbilityKind,
  PlayerUpgrades,
  Ship,
  ShipWeaponKind,
  UpgradeDefinition,
} from './types'

// Back-compat re-export: WEAPON_UNLOCK_UPGRADE now lives in engine/abilities/.
export { WEAPON_UNLOCK_UPGRADE } from './abilities'
export { SHIP_WEAPON_UNLOCK_UPGRADE } from './ship'

// Set of upgrade IDs that unlock a weapon (ability OR ship weapon). Used to
// filter unlock upgrades out of per-weapon upgrade lists so detail / max
// detection views only see modifier upgrades.
export const UNLOCK_UPGRADE_IDS: ReadonlySet<UpgradeId> = new Set([
  ...Object.values(WEAPON_UNLOCK_UPGRADE).filter((id): id is UpgradeId => id !== undefined),
  ...Object.values(SHIP_WEAPON_UNLOCK_UPGRADE).filter((id): id is UpgradeId => id !== undefined),
])

// Ship and power upgrades live here — they aren't per-ability so they don't
// belong in engine/abilities/. Per-ability upgrades are imported from there
// and merged into UPGRADE_DEFINITIONS below.
const shipAndPowerUpgrades: UpgradeDefinition[] = [
  {
    id: UpgradeId.shipMaxHp,
    category: UpgradeCategory.ship,
    label: 'Hull Plating',
    description: 'Increase maximum ship HP',
    tiers: [
      { cost: 6, value: 25 },
      { cost: 24, value: 25 },
      { cost: 96, value: 50 },
    ],
  },
  {
    id: UpgradeId.shipDamage,
    category: UpgradeCategory.ship,
    label: 'Auto-Turret',
    description: 'Increase ship auto-attack damage',
    tiers: [
      { cost: 8, value: 2 },
      { cost: 32, value: 3 },
      { cost: 120, value: 5 },
      { cost: 240, value: 7 },
      { cost: 480, value: 10 },
    ],
  },
  {
    id: UpgradeId.shipFireRate,
    category: UpgradeCategory.ship,
    label: 'Fire Rate',
    description: 'Increase auto-turret fire rate',
    tiers: [
      { cost: 8, value: 0.4 },
      { cost: 32, value: 0.4 },
      { cost: 112, value: 0.6 },
      { cost: 224, value: 0.8 },
      { cost: 448, value: 1.0 },
    ],
  },
  {
    id: UpgradeId.shipShieldStrength,
    category: UpgradeCategory.ship,
    label: 'Shield Capacitor',
    description: 'Increase maximum shield capacity',
    tiers: [
      { cost: 6, value: 20 },
      { cost: 24, value: 20 },
      { cost: 88, value: 40 },
    ],
  },
  {
    id: UpgradeId.shipSpeed,
    category: UpgradeCategory.ship,
    label: 'Engine Boost',
    description: 'Increase ship movement speed',
    tiers: [
      { cost: 8, value: 15 },
      { cost: 32, value: 15 },
      { cost: 112, value: 25 },
    ],
  },
  {
    id: UpgradeId.slingPower,
    category: UpgradeCategory.ship,
    label: 'Slingshot Power',
    description: 'Slingshot the ship farther and faster',
    tiers: [
      { cost: 8, value: 120 },
      { cost: 32, value: 140 },
      { cost: 112, value: 140 },
    ],
  },
  {
    id: UpgradeId.slingAccuracy,
    category: UpgradeCategory.ship,
    label: 'Slingshot Control',
    description: 'Tighten the slingshot — less random scatter',
    tiers: [
      { cost: 8, value: 0.1 },
      { cost: 32, value: 0.11 },
      { cost: 112, value: 0.12 },
    ],
  },
  {
    id: UpgradeId.slingCooldown,
    category: UpgradeCategory.ship,
    label: 'Slingshot Cadence',
    description: 'Shorten the cooldown between slingshots',
    tiers: [
      { cost: 8, value: 0.2 },
      { cost: 32, value: 0.2 },
      { cost: 112, value: 0.2 },
    ],
  },
  {
    id: UpgradeId.slingHeatSink,
    category: UpgradeCategory.ship,
    label: 'Slingshot Heat Sink',
    description: 'Cool slingshot heat faster, so you can sling more before overheating',
    tiers: [
      { cost: 8, value: 0.06 },
      { cost: 32, value: 0.07 },
      { cost: 112, value: 0.08 },
    ],
  },
  {
    id: UpgradeId.powerRegen,
    category: UpgradeCategory.powers,
    label: 'Power Regen',
    description: 'Increase passive power regeneration',
    tiers: [
      { cost: 8, value: 1 },
      { cost: 32, value: 2 },
      { cost: 120, value: 3 },
    ],
  },
]

export const UPGRADE_DEFINITIONS: Record<UpgradeId, UpgradeDefinition> = Object.fromEntries(
  [...ABILITY_UPGRADE_DEFINITIONS, ...SHIP_WEAPON_UPGRADE_DEFINITIONS, ...shipAndPowerUpgrades].map(
    (d) => [d.id, d]
  )
) as Record<UpgradeId, UpgradeDefinition>

// True when every modifier upgrade for `weapon` is at its max tier.
export function isWeaponFullyMaxed(weapon: AbilityKind, upgrades: PlayerUpgrades): boolean {
  return isModifierSetFullyMaxed(weapon, UpgradeCategory.weapons, upgrades)
}

// Parallel of isWeaponFullyMaxed for ship weapons (category: loadout).
export function isShipWeaponFullyMaxed(weapon: ShipWeaponKind, upgrades: PlayerUpgrades): boolean {
  return isModifierSetFullyMaxed(weapon, UpgradeCategory.loadout, upgrades)
}

function isModifierSetFullyMaxed(
  weapon: AbilityKind | ShipWeaponKind,
  category: UpgradeCategory,
  upgrades: PlayerUpgrades
): boolean {
  const modifiers = Object.values(UPGRADE_DEFINITIONS).filter(
    (def) => def.category === category && def.weapon === weapon && !UNLOCK_UPGRADE_IDS.has(def.id)
  )
  if (modifiers.length === 0) return false
  return modifiers.every((def) => upgrades[def.id].currentTier >= def.tiers.length)
}

export const UPGRADE_CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  [UpgradeCategory.weapons]: 'Weapons',
  [UpgradeCategory.ship]: 'Ship',
  [UpgradeCategory.loadout]: 'Loadout',
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
  const existingMax = abilities.reduce(
    (max, a) => (a.unlockedAt !== null && a.unlockedAt > max ? a.unlockedAt : max),
    -1
  )
  let nextIndex = existingMax + 1
  return abilities.map((ability) => {
    const def = ABILITY_DEFINITIONS[ability.kind]
    const patch = def.applyUpgrades?.(ability, upgrades) ?? {}
    const merged = { ...ability, ...patch }
    if (merged.unlocked && merged.unlockedAt === null) {
      merged.unlockedAt = nextIndex++
    }
    return merged
  })
}

export function applyUpgradesToShip(ship: Ship, upgrades: PlayerUpgrades): Ship {
  const base = SHIP_VARIANTS[ship.kind].stats
  const maxHp = applyTierSum(base.maxHp, upgrades, UPGRADE_DEFINITIONS[UpgradeId.shipMaxHp])
  const damage = applyTierSum(base.damage, upgrades, UPGRADE_DEFINITIONS[UpgradeId.shipDamage])
  const fireRate = applyTierSum(
    base.fireRate,
    upgrades,
    UPGRADE_DEFINITIONS[UpgradeId.shipFireRate]
  )
  const maxShield = applyTierSum(
    base.maxShield,
    upgrades,
    UPGRADE_DEFINITIONS[UpgradeId.shipShieldStrength]
  )
  const speed = applyTierSum(base.speed, upgrades, UPGRADE_DEFINITIONS[UpgradeId.shipSpeed])

  // Slingshot: Power adds coast speed, Control trims jitter, Cadence trims the
  // cooldown, Heat Sink adds cooling — each floored/capped so upgrades can't
  // overshoot into degenerate values. (`-1` sign = the upgrade subtracts.)
  const slingMaxSpeed = applyTierSum(
    SLINGSHOT.baseSpeed,
    upgrades,
    UPGRADE_DEFINITIONS[UpgradeId.slingPower]
  )
  const slingJitter = Math.max(
    SLINGSHOT.minJitter,
    applyTierSum(SLINGSHOT.baseJitter, upgrades, UPGRADE_DEFINITIONS[UpgradeId.slingAccuracy], -1)
  )
  const slingCooldown = Math.max(
    SLINGSHOT.minCooldown,
    applyTierSum(SLINGSHOT.baseCooldown, upgrades, UPGRADE_DEFINITIONS[UpgradeId.slingCooldown], -1)
  )
  const slingCoolRate = Math.min(
    SLINGSHOT.maxCoolRate,
    applyTierSum(SLINGSHOT.baseCoolRate, upgrades, UPGRADE_DEFINITIONS[UpgradeId.slingHeatSink])
  )

  const hpGain = maxHp - ship.maxHp
  const shieldGain = maxShield - ship.maxShield
  return {
    ...ship,
    maxHp,
    hp: Math.min(ship.hp + Math.max(0, hpGain), maxHp),
    maxShield,
    shield: Math.min(ship.shield + Math.max(0, shieldGain), maxShield),
    damage,
    fireRate,
    speed,
    slingMaxSpeed,
    slingJitter,
    slingCooldown,
    slingCoolRate,
  }
}

export function applyUpgradesToPowerRegen(baseRegen: number, upgrades: PlayerUpgrades): number {
  return applyTierSum(baseRegen, upgrades, UPGRADE_DEFINITIONS[UpgradeId.powerRegen])
}

export function getLevel(wave: number): number {
  if (wave <= 0) return 0
  return Math.ceil(wave / WAVES_PER_LEVEL)
}

export function isUpgradeWave(wave: number): boolean {
  return wave > 0 && wave % WAVES_PER_LEVEL === 0
}
