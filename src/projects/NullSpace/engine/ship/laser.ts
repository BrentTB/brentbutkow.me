import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { LASER } from './ship-weapon-data'
import {
  makeLoadoutUpgrade,
  buildShipProjectile,
  type ShipWeaponDefinition,
} from './ship-weapon-definition'

export const LASER_UPGRADE_IDS = {
  unlockLaser: 'unlockLaser',
  laserDamage: 'laserDamage',
  laserPierce: 'laserPierce',
} as const

const upgrade = makeLoadoutUpgrade(ShipWeaponKind.laser)

const unlockUpgrade = upgrade({
  id: LASER_UPGRADE_IDS.unlockLaser,
  label: 'Unlock Laser',
  description: 'A piercing beam that punches through enemies in a line',
  tiers: [{ cost: 60, value: 1 }],
})

const damageUpgrade = upgrade({
  id: LASER_UPGRADE_IDS.laserDamage,
  label: 'Damage',
  description: 'Increase laser damage per hit',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 80, value: 3 },
    { cost: 200, value: 5 },
  ],
})

const pierceUpgrade = upgrade({
  id: LASER_UPGRADE_IDS.laserPierce,
  label: 'Pierce',
  description: 'Beam pierces through one additional enemy',
  tiers: [
    { cost: 40, value: 1 },
    { cost: 160, value: 1 },
  ],
})

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
