import type {
  Ability,
  AbilityKind,
  ActiveEffect,
  Ally,
  PlayerUpgrades,
  Ship,
  UpgradeDefinition,
  Vec2,
} from '../types'
import type { HoldAbilityConfig } from './hold-runtime'

export type AbilityActivation = 'click' | 'hold'

export type AbilityDefinition = {
  kind: AbilityKind
  meta: { icon: string; label: string }
  activation: AbilityActivation
  // True only for abilities the player has from the very first wave (currently
  // just meteorite). Everything else needs its `unlockUpgrade` to be purchased.
  startsUnlocked?: boolean
  // Base stats — used by createAbilities() at the start of a run.
  base: () => Omit<Ability, 'cooldownRemaining' | 'unlocked' | 'unlockedAt'>
  // Click abilities that spawn a stationary or kinetic effect (meteorite,
  // rocket, sun, etc.).
  effectFactory?: (ability: Ability, targetPos: Vec2, ship: Ship) => ActiveEffect
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
