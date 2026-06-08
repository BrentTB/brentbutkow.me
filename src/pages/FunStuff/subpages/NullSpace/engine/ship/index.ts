import { ShipWeaponKind } from '../types'
import type { UpgradeDefinition, UpgradeId } from '../types'

import { bullet } from './bullet'
import { laser } from './laser'
import { missile } from './missile'
import { ricochet } from './ricochet'
import { nuke } from './nuke'
import type { ShipWeaponDefinition } from './ship-weapon-definition'
import type { IconName } from '../../icon-names'

export type { ShipWeaponDefinition } from './ship-weapon-definition'
export { buildShipProjectile } from './ship-weapon-definition'

// Re-exports of the moved-from-data.ts ship-variant data, so callers that
// already import from `engine/ship` (instead of `data.ts`) keep working.
export {
  SHIP_DEFAULTS,
  SHIP_ORDER,
  SHIP_VARIANTS,
  STAT_MAX,
  type ShipVariantConfig,
  type ShipVariantStats,
} from './ship-data'

// Single source of truth: every ship weapon registers itself in one file and
// gets added here. All downstream lookup tables (meta, factories, upgrades) are
// DERIVED from this map, so a new weapon only needs a new file + registry entry.
export const SHIP_WEAPON_DEFINITIONS: Record<ShipWeaponKind, ShipWeaponDefinition> = {
  [ShipWeaponKind.bullet]: bullet,
  [ShipWeaponKind.laser]: laser,
  [ShipWeaponKind.missile]: missile,
  [ShipWeaponKind.ricochet]: ricochet,
  [ShipWeaponKind.nuke]: nuke,
}

export const SHIP_WEAPON_LIST: ShipWeaponDefinition[] = Object.values(SHIP_WEAPON_DEFINITIONS)

// Display order for the Loadout shop tab. Edit this array to reorder.
export const SHIP_WEAPON_ORDER: readonly ShipWeaponKind[] = [
  ShipWeaponKind.bullet,
  ShipWeaponKind.laser,
  ShipWeaponKind.missile,
  ShipWeaponKind.ricochet,
  ShipWeaponKind.nuke,
]

// --- Derived lookup tables ---

export const SHIP_WEAPON_META: Record<ShipWeaponKind, { icon: IconName; label: string }> =
  Object.fromEntries(SHIP_WEAPON_LIST.map((d) => [d.kind, d.meta])) as Record<
    ShipWeaponKind,
    { icon: IconName; label: string }
  >

export const SHIP_WEAPON_UNLOCK_UPGRADE: Partial<Record<ShipWeaponKind, UpgradeId>> =
  Object.fromEntries(
    SHIP_WEAPON_LIST.filter((d) => d.unlockUpgrade).map((d) => [d.kind, d.unlockUpgrade!.id])
  )

// Every upgrade contributed by a ship-weapon file (unlock + modifiers), flat.
// Merged into UPGRADE_DEFINITIONS alongside ABILITY_UPGRADE_DEFINITIONS and the
// ship/power upgrades in engine/upgrades.ts.
export const SHIP_WEAPON_UPGRADE_DEFINITIONS: UpgradeDefinition[] = SHIP_WEAPON_LIST.flatMap(
  (d) => [...(d.unlockUpgrade ? [d.unlockUpgrade] : []), ...(d.modifierUpgrades ?? [])]
)

// Maps an upgrade id back to its weapon kind (mirror of WEAPON_UNLOCK_UPGRADE
// reverse). Used to push purchased weapons into GameState.unlockedWeapons.
export function getShipWeaponForUnlockUpgrade(upgradeId: UpgradeId): ShipWeaponKind | null {
  for (const kind of Object.keys(SHIP_WEAPON_UNLOCK_UPGRADE) as ShipWeaponKind[]) {
    if (SHIP_WEAPON_UNLOCK_UPGRADE[kind] === upgradeId) return kind
  }
  return null
}
