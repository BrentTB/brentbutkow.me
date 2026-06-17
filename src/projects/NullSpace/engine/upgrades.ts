import { SLINGSHOT, WAVES_PER_LEVEL } from '../data'
import {
  ABILITY_DEFINITIONS,
  ABILITY_UPGRADE_DEFINITIONS,
  BASE_KIND_OF,
  ULTIMATE_DEFINITIONS,
  WEAPON_UNLOCK_UPGRADE,
  applyTierSum,
} from './abilities'
import { HELPER_WEAPON_UNLOCK_UPGRADE, HELPER_WEAPON_UPGRADE_DEFINITIONS } from './weapons'
import { SHIP_VARIANTS } from './ship/ship-data'
import { AbilityKind, UpgradeCategory } from './types'
import type { UpgradeId } from './upgrade-ids'
import type { Ability, PlayerUpgrades, Ship, UpgradeDefinition } from './types'

export const SHIP_AND_POWER_UPGRADE_IDS = {
  shipMaxHp: 'shipMaxHp',
  shipShieldStrength: 'shipShieldStrength',
  shipSpeed: 'shipSpeed',
  slingPower: 'slingPower',
  slingAccuracy: 'slingAccuracy',
  slingCooldown: 'slingCooldown',
  slingHeatSink: 'slingHeatSink',
  powerRegen: 'powerRegen',
  lifeRegen: 'lifeRegen',
  stardustMultiplier: 'stardustMultiplier',
  spaceMetalChance: 'spaceMetalChance',
  powerPerKill: 'powerPerKill',
} as const

// Set of upgrade IDs that unlock a weapon (ability OR helper weapon). Used to
// filter unlock upgrades out of per-weapon upgrade lists so detail / max
// detection views only see modifier upgrades.
export const UNLOCK_UPGRADE_IDS: ReadonlySet<UpgradeId> = new Set([
  ...Object.values(WEAPON_UNLOCK_UPGRADE).filter((id): id is UpgradeId => id !== undefined),
  ...Object.values(HELPER_WEAPON_UNLOCK_UPGRADE).filter((id): id is UpgradeId => id !== undefined),
])

// Ship and power upgrades live here — they aren't per-ability so they don't
// belong in engine/abilities/. Per-ability upgrades are imported from there
// and merged into UPGRADE_DEFINITIONS below.
const shipAndPowerUpgrades: UpgradeDefinition[] = [
  {
    id: SHIP_AND_POWER_UPGRADE_IDS.shipMaxHp,
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
    id: SHIP_AND_POWER_UPGRADE_IDS.shipShieldStrength,
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
    id: SHIP_AND_POWER_UPGRADE_IDS.shipSpeed,
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
    id: SHIP_AND_POWER_UPGRADE_IDS.slingPower,
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
    id: SHIP_AND_POWER_UPGRADE_IDS.slingAccuracy,
    category: UpgradeCategory.ship,
    label: 'Slingshot Control',
    description: 'Icreases the slingshot accuracy',
    tiers: [
      { cost: 8, value: 0.1 },
      { cost: 32, value: 0.11 },
      { cost: 112, value: 0.12 },
    ],
  },
  {
    id: SHIP_AND_POWER_UPGRADE_IDS.slingCooldown,
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
    id: SHIP_AND_POWER_UPGRADE_IDS.slingHeatSink,
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
    id: SHIP_AND_POWER_UPGRADE_IDS.powerRegen,
    category: UpgradeCategory.powers,
    label: 'Power Regen',
    description: 'Increase passive power regeneration',
    tiers: [
      { cost: 8, value: 2 },
      { cost: 32, value: 4 },
      { cost: 120, value: 8 },
      { cost: 360, value: 16 },
      { cost: 1080, value: 32 },
    ],
  },
  {
    id: SHIP_AND_POWER_UPGRADE_IDS.lifeRegen,
    category: UpgradeCategory.powers,
    label: 'Life Regen',
    description: 'Slowly regenerate ship HP over time (none by default)',
    tiers: [
      { cost: 12, value: 1 },
      { cost: 48, value: 1 },
      { cost: 160, value: 2 },
    ],
  },
  {
    id: SHIP_AND_POWER_UPGRADE_IDS.stardustMultiplier,
    category: UpgradeCategory.powers,
    label: 'Stardust Yield',
    description: 'Multiplies the Stardust earned from every kill',
    tiers: [
      { cost: 20, value: 0.25 },
      { cost: 80, value: 0.25 },
      { cost: 240, value: 0.5 },
    ],
  },
  {
    id: SHIP_AND_POWER_UPGRADE_IDS.spaceMetalChance,
    category: UpgradeCategory.powers,
    label: 'Metal Detector',
    description: 'Increases the chance enemies drop Space Metal',
    tiers: [
      { cost: 20, value: 0.5 },
      { cost: 80, value: 0.5 },
      { cost: 240, value: 1 },
    ],
  },
  {
    id: SHIP_AND_POWER_UPGRADE_IDS.powerPerKill,
    category: UpgradeCategory.powers,
    label: 'Energy Siphon',
    description: 'Multiplies the power gained from each enemy kill',
    tiers: [
      { cost: 20, value: 0.25 },
      { cost: 80, value: 0.25 },
      { cost: 240, value: 0.5 },
    ],
  },
]

// Ship upgrades grouped under the Slingshot drill-down in the shop. The rest of
// the ship-category upgrades stay at the top level.
export const SLINGSHOT_UPGRADE_IDS: readonly UpgradeId[] = [
  SHIP_AND_POWER_UPGRADE_IDS.slingPower,
  SHIP_AND_POWER_UPGRADE_IDS.slingAccuracy,
  SHIP_AND_POWER_UPGRADE_IDS.slingCooldown,
  SHIP_AND_POWER_UPGRADE_IDS.slingHeatSink,
]

export const UPGRADE_DEFINITIONS: Record<UpgradeId, UpgradeDefinition> = Object.fromEntries(
  [
    ...ABILITY_UPGRADE_DEFINITIONS,
    ...HELPER_WEAPON_UPGRADE_DEFINITIONS,
    ...shipAndPowerUpgrades,
  ].map((d) => [d.id, d])
) as Record<UpgradeId, UpgradeDefinition>

// Modifier upgrades shown on a weapon's shop detail page. For an ultimate, this
// also folds in its BASE ability's modifiers — the ultimate inherits them
// (e.g. Comet Shower's per-meteor damage tracks Meteorite's Damage upgrade), so
// they stay buyable after the base is replaced in the hotbar.
export function getWeaponModifierUpgrades(weapon: AbilityKind): UpgradeDefinition[] {
  const baseKind = BASE_KIND_OF[weapon]
  return Object.values(UPGRADE_DEFINITIONS).filter(
    (def) =>
      def.category === UpgradeCategory.weapons &&
      (def.weapon === weapon || def.weapon === baseKind) &&
      !UNLOCK_UPGRADE_IDS.has(def.id)
  )
}

// The helper-weapon unlocks shown on the Helper line's detail page — the base
// Helper or its Helper Factory ultimate (which inherits them). Buying one arms
// ~1/4 of summoned allies with that weapon (see rollAllyWeapon). They keep the
// loadout category (no shop tab renders it) and surface only here.
export function getAllyWeaponUnlocks(weapon: AbilityKind): UpgradeDefinition[] {
  const isHelperLine = weapon === AbilityKind.helper || BASE_KIND_OF[weapon] === AbilityKind.helper
  if (!isHelperLine) return []
  return Object.values(UPGRADE_DEFINITIONS).filter(
    (def) => def.category === UpgradeCategory.loadout && UNLOCK_UPGRADE_IDS.has(def.id)
  )
}

// True when there's nothing left to buy for `weapon`. A base ability that still
// offers an unpurchased ultimate is never "maxed" — the shop list only shows the
// base while its ultimate is unowned, so there's always the ultimate to buy. For
// everything else, every modifier (an ultimate also folds in its inherited base
// modifiers) must be at max tier.
export function isWeaponFullyMaxed(weapon: AbilityKind, upgrades: PlayerUpgrades): boolean {
  if (ULTIMATE_DEFINITIONS[weapon]) return false
  return allModifiersAtMaxTier(getWeaponModifierUpgrades(weapon), upgrades)
}

// True when every modifier in the set sits at its top tier. An empty set is
// "not maxed" — a freshly-unlocked weapon has nothing to buy yet but isn't done.
function allModifiersAtMaxTier(modifiers: UpgradeDefinition[], upgrades: PlayerUpgrades): boolean {
  if (modifiers.length === 0) return false
  return modifiers.every((def) => upgrades[def.id].currentTier >= def.tiers.length)
}

export const UPGRADE_CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  [UpgradeCategory.weapons]: 'Weapons',
  [UpgradeCategory.ship]: 'Ship',
  [UpgradeCategory.powers]: 'Powers',
  // Type-fill only: the loadout category has no shop tab (CATEGORY_ORDER omits
  // it), so this label never renders.
  [UpgradeCategory.loadout]: 'Allies',
}

export function createInitialUpgrades(): PlayerUpgrades {
  const upgrades = {} as PlayerUpgrades
  for (const id of Object.keys(UPGRADE_DEFINITIONS) as UpgradeId[]) {
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

// Syncs ownership of ultimates onto the runtime ability rows: an owned
// ultimate becomes unlocked and inherits its base's hotbar slot (so it takes
// the base's hotkey); an unowned ultimate stays locked. Run after
// applyUpgradesToAbilities, whenever abilities or ownership change.
export function syncUltimateAbilities(
  abilities: Ability[],
  ultimatesOwned: AbilityKind[]
): Ability[] {
  const owned = new Set(ultimatesOwned)
  return abilities.map((ability) => {
    const baseKind = BASE_KIND_OF[ability.kind]
    if (baseKind === undefined) return ability // not an ultimate row
    if (owned.has(ability.kind)) {
      const baseRow = abilities.find((b) => b.kind === baseKind)
      return { ...ability, unlocked: true, unlockedAt: baseRow?.unlockedAt ?? ability.unlockedAt }
    }
    return ability.unlocked || ability.unlockedAt !== null
      ? { ...ability, unlocked: false, unlockedAt: null }
      : ability
  })
}

export function applyUpgradesToShip(ship: Ship, upgrades: PlayerUpgrades): Ship {
  const base = SHIP_VARIANTS[ship.kind].stats
  const maxHp = applyTierSum(
    base.maxHp,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.shipMaxHp]
  )
  const maxShield = applyTierSum(
    base.maxShield,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.shipShieldStrength]
  )
  const speed = applyTierSum(
    base.speed,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.shipSpeed]
  )

  // Slingshot: Power adds coast speed (bounded only by its tier data), while
  // Control trims jitter, Cadence trims the cooldown, and Heat Sink adds
  // cooling — those three floored/capped so upgrades can't overshoot into
  // degenerate values. (`-1` sign = the upgrade subtracts.)
  const slingMaxSpeed = applyTierSum(
    SLINGSHOT.baseSpeed,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.slingPower]
  )
  const slingJitter = Math.max(
    SLINGSHOT.minJitter,
    applyTierSum(
      SLINGSHOT.baseJitter,
      upgrades,
      UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.slingAccuracy],
      -1
    )
  )
  const slingCooldown = Math.max(
    SLINGSHOT.minCooldown,
    applyTierSum(
      SLINGSHOT.baseCooldown,
      upgrades,
      UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.slingCooldown],
      -1
    )
  )
  const slingCoolRate = Math.min(
    SLINGSHOT.maxCoolRate,
    applyTierSum(
      SLINGSHOT.baseCoolRate,
      upgrades,
      UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.slingHeatSink]
    )
  )

  const hpRegen = applyTierSum(
    0,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.lifeRegen]
  )

  const hpGain = maxHp - ship.maxHp
  const shieldGain = maxShield - ship.maxShield
  return {
    ...ship,
    maxHp,
    hp: Math.min(ship.hp + Math.max(0, hpGain), maxHp),
    maxShield,
    shield: Math.min(ship.shield + Math.max(0, shieldGain), maxShield),
    hpRegen,
    speed,
    slingMaxSpeed,
    slingJitter,
    slingCooldown,
    slingCoolRate,
  }
}

export function applyUpgradesToPowerRegen(baseRegen: number, upgrades: PlayerUpgrades): number {
  return applyTierSum(
    baseRegen,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.powerRegen]
  )
}

// Multiplier (≥1) applied to Stardust earned from kills. 1 with no upgrade.
export function getStardustMultiplier(upgrades: PlayerUpgrades): number {
  return applyTierSum(
    1,
    upgrades,
    UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.stardustMultiplier]
  )
}

// Multiplier (≥1) applied to enemy Space Metal drop chances. 1 with no upgrade.
export function getSpaceMetalDropMultiplier(upgrades: PlayerUpgrades): number {
  return applyTierSum(1, upgrades, UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.spaceMetalChance])
}

// Multiplier (≥1) applied to the power a kill drops (power orb value). 1 with no upgrade.
export function getPowerOrbMultiplier(upgrades: PlayerUpgrades): number {
  return applyTierSum(1, upgrades, UPGRADE_DEFINITIONS[SHIP_AND_POWER_UPGRADE_IDS.powerPerKill])
}

export function getLevel(wave: number): number {
  if (wave <= 0) return 0
  return Math.ceil(wave / WAVES_PER_LEVEL)
}

export function isUpgradeWave(wave: number): boolean {
  return wave > 0 && wave % WAVES_PER_LEVEL === 0
}
