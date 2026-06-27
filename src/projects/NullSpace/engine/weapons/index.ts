import { HelperWeaponKind } from '../types'
import type { UpgradeDefinition } from '../types'
import type { UpgradeId } from '../upgrade-ids'

import { bullet } from './bullet'
import { laser } from './laser'
import { missile } from './missile'
import { ricochet } from './ricochet'
import { nuke } from './nuke'
import type { HelperWeaponDefinition } from './helper-weapon-definition'

export type { HelperWeaponDefinition } from './helper-weapon-definition'
export { buildHelperProjectile } from './helper-weapon-definition'

// Single source of truth: every helper weapon registers itself in one file and
// gets added here. All downstream lookup tables (meta, factories, upgrades) are
// DERIVED from this map, so a new weapon only needs a new file + registry entry.
export const HELPER_WEAPON_DEFINITIONS: Record<HelperWeaponKind, HelperWeaponDefinition> = {
  [HelperWeaponKind.bullet]: bullet,
  [HelperWeaponKind.laser]: laser,
  [HelperWeaponKind.missile]: missile,
  [HelperWeaponKind.ricochet]: ricochet,
  [HelperWeaponKind.nuke]: nuke,
}

export const HELPER_WEAPON_LIST: HelperWeaponDefinition[] = Object.values(HELPER_WEAPON_DEFINITIONS)

// --- Derived lookup tables ---

export const HELPER_WEAPON_UNLOCK_UPGRADE: Partial<Record<HelperWeaponKind, UpgradeId>> =
  Object.fromEntries(
    HELPER_WEAPON_LIST.filter((d) => d.unlockUpgrade).map((d) => [d.kind, d.unlockUpgrade!.id])
  )

// The unlock upgrade contributed by each helper-weapon file, flat. Merged into
// UPGRADE_DEFINITIONS alongside ABILITY_UPGRADE_DEFINITIONS and the ship/power
// upgrades in engine/upgrades.ts.
export const HELPER_WEAPON_UPGRADE_DEFINITIONS: UpgradeDefinition[] = HELPER_WEAPON_LIST.flatMap(
  (d) => (d.unlockUpgrade ? [d.unlockUpgrade] : [])
)

// Maps an upgrade id back to its weapon kind (mirror of WEAPON_UNLOCK_UPGRADE
// reverse). Used to push purchased weapons into GameState.unlockedWeapons.
export function getHelperWeaponForUnlockUpgrade(upgradeId: UpgradeId): HelperWeaponKind | null {
  for (const kind of Object.keys(HELPER_WEAPON_UNLOCK_UPGRADE) as HelperWeaponKind[]) {
    if (HELPER_WEAPON_UNLOCK_UPGRADE[kind] === upgradeId) return kind
  }
  return null
}
