import type {
  Ability,
  AbilityKind,
  ActiveEffect,
  Ally,
  Enemy,
  GameState,
  PlayerUpgrades,
  Ship,
  UpgradeDefinition,
  Vec2,
} from '../types'
import { UpgradeCategory } from '../types'
import type { HoldAbilityConfig } from './hold-runtime'
import type { IconName } from '../../icon-names'

export const AbilityActivation = { click: 'click', hold: 'hold' } as const
export type AbilityActivation = (typeof AbilityActivation)[keyof typeof AbilityActivation]

// Fixed currency cost of an Ultimate purchase. The Singularity Shard portion is
// dynamic (= ultimatesOwned.length + 1 at purchase time) so it lives in the
// purchase logic, not here.
export type UltimateCost = { stardust: number; spaceMetal: number }

// Affordability/ownership context — the structural subset of GameState (which
// GameUIState also satisfies) that the shop and the engine both read, so one
// predicate gates a purchase in both.
export type UltimateContext = Pick<
  GameState,
  'currency' | 'spaceMetal' | 'singularityShard' | 'ultimatesOwned' | 'abilities'
>

// Optional gate beyond "base ability unlocked". Absent → the default
// (base unlocked) applies. Reads the shared context so the buy-button and the
// purchase logic evaluate the same condition.
export type UltimatePrerequisite = (ctx: UltimateContext) => boolean

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
  // Click abilities that convert enemies into temporary allies (Hypnosis / Pied
  // Piper). Reads the live enemy + ally lists (which allyFactory can't) to pick
  // victims and honour the charm cap; returns the new charmed allies and the enemy
  // ids to remove. An empty result (no valid target / at cap) is a no-op in
  // tryUseAbility — no cooldown or power spent.
  charmFactory?: (
    targetPos: Vec2,
    ability: Ability,
    enemies: Enemy[],
    allies: Ally[]
  ) => { allies: Ally[]; consumedEnemyIds: string[] }
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

// Builds an ultimate's applyUpgrades on top of its base ability's. The base's
// full upgrade patch flows through — a field the base starts upgrading later
// can't be silently dropped — minus `unlocked`: an ultimate unlocks via
// ownership (syncUltimateAbilities), never via the base's unlock upgrade.
// The ultimate's own overrides merge last and may read the base patch.
export function composeUltimateUpgrades(
  base: AbilityDefinition,
  overrides: (basePatch: Partial<Ability>, upgrades: PlayerUpgrades) => Partial<Ability>
): NonNullable<AbilityDefinition['applyUpgrades']> {
  return (ability, upgrades) => {
    const basePatch = { ...base.applyUpgrades?.(ability, upgrades) }
    delete basePatch.unlocked
    return { ...basePatch, ...overrides(basePatch, upgrades) }
  }
}

// Binds an ability so each of its upgrades declares only id/label/description/
// tiers — the shared category + weapon fields are injected once per file. Cuts
// the per-upgrade boilerplate and the copy-paste risk of a stale weapon tag.
export function makeAbilityUpgrade(
  weapon: AbilityKind
): (def: Omit<UpgradeDefinition, 'category' | 'weapon'>) => UpgradeDefinition {
  return (def) => ({ ...def, category: UpgradeCategory.weapons, weapon })
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
