import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind, UpgradeCategory } from '../types'
import type { UpgradeDefinition } from '../types'
import { IconName } from '../../icon-names'
import { LASER } from './ship-weapon-data'
import { buildShipProjectile, type ShipWeaponDefinition } from './ship-weapon-definition'

export const LASER_UPGRADE_IDS = {
  unlockLaser: 'unlockLaser',
  laserDamage: 'laserDamage',
  laserPierce: 'laserPierce',
} as const

const unlockUpgrade: UpgradeDefinition = {
  id: LASER_UPGRADE_IDS.unlockLaser,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.laser,
  label: 'Unlock Laser',
  description: 'A piercing beam that punches through enemies in a line',
  tiers: [{ cost: 60, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: LASER_UPGRADE_IDS.laserDamage,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.laser,
  label: 'Damage',
  description: 'Increase laser damage per hit',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 80, value: 3 },
    { cost: 200, value: 5 },
  ],
}

const pierceUpgrade: UpgradeDefinition = {
  id: LASER_UPGRADE_IDS.laserPierce,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.laser,
  label: 'Pierce',
  description: 'Beam pierces through one additional enemy',
  tiers: [
    { cost: 40, value: 1 },
    { cost: 160, value: 1 },
  ],
}

export const laser: ShipWeaponDefinition = {
  kind: ShipWeaponKind.laser,
  meta: { icon: IconName.laser, label: 'Laser' },
  fireRateMultiplier: LASER.fireRateMultiplier,
  weaponDamage: (baseShipDamage, upgrades) =>
    applyTierSum(baseShipDamage * LASER.damageMultiplier, upgrades, damageUpgrade),
  createProjectiles: (shipPos, targetPos, damage, upgrades) => {
    const maxHits = applyTierSum(LASER.basePierce, upgrades, pierceUpgrade)
    return [
      buildShipProjectile(shipPos, targetPos, damage, {
        speed: LASER.speed,
        lifetime: LASER.lifetime,
        pierce: { maxHits, hitEnemyIds: [] },
      }),
    ]
  },
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, pierceUpgrade],
}
