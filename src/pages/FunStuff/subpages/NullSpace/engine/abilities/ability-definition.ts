import type {
  Ability,
  AbilityKind,
  ActiveEffect,
  Ally,
  GameState,
  PlayerUpgrades,
  Ship,
  UpgradeDefinition,
  Vec2,
} from '../types'
import type { HoldAbilityConfig } from './hold-runtime'
import type { IconName } from '../../icon-names'

export type AbilityActivation = 'click' | 'hold'

// Fixed currency cost of an Ultimate purchase. The Singularity Shard portion is
// dynamic (= ultimatesOwned.length + 1 at purchase time) so it lives in the
// purchase logic, not here.
export type UltimateCost = { stardust: number; spaceMetal: number }

// Optional gate beyond "base ability unlocked". Absent → the default
// (base unlocked) applies.
export type UltimatePrerequisite = (state: GameState) => boolean

// Describes the Ultimate a base ability offers. Absent → no ultimate (yet).
export type UltimateDescriptor = {
  // The ultimate AbilityKind this base unlocks (its own registered definition).
  kind: AbilityKind
  label: string
  description: string
  cost: UltimateCost
  prerequisite?: UltimatePrerequisite
}

export type AbilityDefinition = {
  kind: AbilityKind
  meta: { icon: IconName; label: string }
  activation: AbilityActivation
  // True only for abilities the player has from the very first wave (currently
  // just meteorite). Everything else needs its `unlockUpgrade` to be purchased.
  startsUnlocked?: boolean
  // Base stats — used by createAbilities() at the start of a run.
  base: () => Omit<Ability, 'cooldownRemaining' | 'unlocked' | 'unlockedAt'>
  // Click abilities that spawn one or more stationary/kinetic effects
  // (meteorite, rocket, sun, etc.). Returns an array so multi-strike ultimates
  // (Comet Shower, Meteor Shower) can spawn several staggered impacts.
  effectFactory?: (ability: Ability, targetPos: Vec2, ship: Ship) => ActiveEffect[]
  // Click abilities that spawn an ally entity (helper). Receives the upgraded
  // ability so the factory can read fields like damage and maxHp.
  allyFactory?: (pos: Vec2, ability: Ability) => Ally
  // Computes the live ability values after applying the player's purchased
  // upgrade tiers. Returns a partial that the engine merges over the base.
  applyUpgrades?: (ability: Ability, upgrades: PlayerUpgrades) => Partial<Ability>
  // One-tier purchase that unlocks the ability. Absent for starter abilities.
  unlockUpgrade?: UpgradeDefinition
  // Tiered upgrades for damage, duration, radius, efficiency, etc.
  modifierUpgrades?: UpgradeDefinition[]
  // The Ultimate this base ability offers. Absent on abilities without one
  // (yet) and on ultimate definitions themselves.
  ultimate?: UltimateDescriptor
  // Set on an ultimate's own definition: the base ability it upgrades. Absent
  // on base abilities.
  ultimateOf?: AbilityKind
  // Hold-activation runtime config. Present iff `activation === 'hold'`. Drives
  // the generic hold runner (arm gate, drain, deactivation)
  hold?: HoldAbilityConfig
}

// Helper: sum the values of the first N tiers of an upgrade onto a base value.
// `sign` lets cost-reduction upgrades subtract their tier values instead of
// adding them. Returns base when the player hasn't purchased any tier.
export function applyTierSum(
  base: number,
  upgrades: PlayerUpgrades,
  upgradeDef: UpgradeDefinition,
  sign: 1 | -1 = 1
): number {
  const tier = upgrades[upgradeDef.id].currentTier
  let value = base
  for (let i = 0; i < tier; i++) {
    value += sign * upgradeDef.tiers[i].value
  }
  return value
}

// Floor a power cost can never drop below, however many efficiency tiers are bought.
const MIN_POWER_COST = 1

// Applies an efficiency upgrade: subtracts the purchased tiers from the base
// power cost, floored so an ability never becomes free.
export function applyCostReduction(
  base: number,
  upgrades: PlayerUpgrades,
  upgradeDef: UpgradeDefinition
): number {
  return Math.max(MIN_POWER_COST, applyTierSum(base, upgrades, upgradeDef, -1))
}
