import { WEAPON_ORDER } from '../../data'
import { AbilityKind } from '../types'
import type { Ability, ActiveEffect, Ally, Ship, UpgradeDefinition, Vec2 } from '../types'

import { meteorite } from './meteorite'
import { meteor } from './meteor'
import { blackHole } from './black-hole'
import { rocket } from './rocket'
import { shield } from './shield'
import { sun } from './sun'
import { helper } from './helper'
import { telekinesis } from './telekinesis'
import { solarFlare } from './solar-flare'
import { cometShower } from './comet-shower'
import { meteorShower } from './meteor-shower'
import { helperFactory } from './helper-factory'
import { supernova } from './supernova'
import { forceField } from './force-field'
import { fireworks } from './fireworks'
import { eventHorizon } from './event-horizon'
import { solarPlague } from './solar-plague'
import { singularity } from './singularity'
import { radiation } from './radiation'
import { meltdown } from './meltdown'
import { chainLightning } from './chain-lightning'
import { ionStorm } from './ion-storm'
import type { UpgradeId } from '../upgrade-ids'
import type { AbilityDefinition, UltimateDescriptor } from './ability-definition'
import type { IconName } from '../../icon-names'

export type { AbilityDefinition, UltimateContext } from './ability-definition'
export { applyTierSum, applyCostReduction } from './ability-definition'

// Runtime helpers (turning input into state changes). Re-exported so any file
// that used to import from `./abilities` still works after the move.
export {
  tryUseAbility,
  updateAbilityCooldowns,
  resolveAbilityInput,
  type AbilityResult,
} from './resolution'

// Single source of truth: every ability registers itself in one file and gets
// added here. All downstream lookup tables (meta, base, factories, upgrades)
// are DERIVED from this map, so adding a new ability only requires creating a
// new file under engine/abilities/ and registering it below.
export const ABILITY_DEFINITIONS: Record<AbilityKind, AbilityDefinition> = {
  [AbilityKind.meteorite]: meteorite,
  [AbilityKind.meteor]: meteor,
  [AbilityKind.blackHole]: blackHole,
  [AbilityKind.rocket]: rocket,
  [AbilityKind.shield]: shield,
  [AbilityKind.sun]: sun,
  [AbilityKind.helper]: helper,
  [AbilityKind.telekinesis]: telekinesis,
  [AbilityKind.solarFlare]: solarFlare,
  [AbilityKind.cometShower]: cometShower,
  [AbilityKind.meteorShower]: meteorShower,
  [AbilityKind.helperFactory]: helperFactory,
  [AbilityKind.supernova]: supernova,
  [AbilityKind.forceField]: forceField,
  [AbilityKind.fireworks]: fireworks,
  [AbilityKind.eventHorizon]: eventHorizon,
  [AbilityKind.solarPlague]: solarPlague,
  [AbilityKind.singularity]: singularity,
  [AbilityKind.radiation]: radiation,
  [AbilityKind.meltdown]: meltdown,
  [AbilityKind.chainLightning]: chainLightning,
  [AbilityKind.ionStorm]: ionStorm,
}

export const ABILITY_LIST: AbilityDefinition[] = Object.values(ABILITY_DEFINITIONS)

// --- Derived lookup tables ---

export const ABILITY_META: Record<AbilityKind, { icon: IconName; label: string }> =
  Object.fromEntries(ABILITY_LIST.map((d) => [d.kind, d.meta])) as Record<
    AbilityKind,
    { icon: IconName; label: string }
  >

export const HOLD_ABILITIES: ReadonlySet<AbilityKind> = new Set(
  ABILITY_LIST.filter((d) => d.activation === 'hold').map((d) => d.kind)
)

type EffectFactory = (ability: Ability, targetPos: Vec2, ship: Ship) => ActiveEffect[]
type AllyFactory = (pos: Vec2, ability: Ability) => Ally

export const EFFECT_FACTORY: Partial<Record<AbilityKind, EffectFactory>> = Object.fromEntries(
  ABILITY_LIST.filter((d) => d.effectFactory).map((d) => [d.kind, d.effectFactory!])
)

export const ALLY_FACTORY: Partial<Record<AbilityKind, AllyFactory>> = Object.fromEntries(
  ABILITY_LIST.filter((d) => d.allyFactory).map((d) => [d.kind, d.allyFactory!])
)

export const WEAPON_UNLOCK_UPGRADE: Partial<Record<AbilityKind, UpgradeId>> = Object.fromEntries(
  ABILITY_LIST.filter((d) => d.unlockUpgrade).map((d) => [d.kind, d.unlockUpgrade!.id])
)

// --- Ultimate maps (derived from the `ultimate` / `ultimateOf` fields) ---

// Base ability kind → its Ultimate descriptor. Present only for abilities that
// offer an ultimate.
export const ULTIMATE_DEFINITIONS: Partial<Record<AbilityKind, UltimateDescriptor>> =
  Object.fromEntries(ABILITY_LIST.filter((d) => d.ultimate).map((d) => [d.kind, d.ultimate!]))

// Base ability kind → its Ultimate's AbilityKind.
export const ULTIMATE_KIND_OF: Partial<Record<AbilityKind, AbilityKind>> = Object.fromEntries(
  ABILITY_LIST.filter((d) => d.ultimate).map((d) => [d.kind, d.ultimate!.kind])
)

// Ultimate AbilityKind → the base ability kind it upgrades.
export const BASE_KIND_OF: Partial<Record<AbilityKind, AbilityKind>> = Object.fromEntries(
  ABILITY_LIST.filter((d) => d.ultimateOf).map((d) => [d.kind, d.ultimateOf!])
)

// Every upgrade contributed by an ability file (unlock + modifiers), flat.
// Ship and power upgrades live in upgrades.ts and are merged with this set.
export const ABILITY_UPGRADE_DEFINITIONS: UpgradeDefinition[] = ABILITY_LIST.flatMap((d) => [
  ...(d.unlockUpgrade ? [d.unlockUpgrade] : []),
  ...(d.modifierUpgrades ?? []),
])

// Replaces the old in-entities.ts `ABILITY_BASE` and `createAbilities`. Lives
// here so adding a new ability doesn't require touching entities.ts.
export function createAbilities(): Ability[] {
  let nextIndex = 0
  return WEAPON_ORDER.map((kind) => {
    const def = ABILITY_DEFINITIONS[kind]
    const unlocked = def.startsUnlocked ?? false
    return {
      ...def.base(),
      cooldownRemaining: 0,
      unlocked,
      unlockedAt: unlocked ? nextIndex++ : null,
    }
  })
}
