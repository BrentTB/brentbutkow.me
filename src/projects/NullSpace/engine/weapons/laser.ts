import { HelperWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { LASER } from './helper-weapon-data'
import {
  makeLoadoutUpgrade,
  buildHelperProjectile,
  type HelperWeaponDefinition,
} from './helper-weapon-definition'

export const LASER_UPGRADE_IDS = {
  unlockLaser: 'unlockLaser',
} as const

const upgrade = makeLoadoutUpgrade(HelperWeaponKind.laser)

const unlockUpgrade = upgrade({
  id: LASER_UPGRADE_IDS.unlockLaser,
  label: 'Ally Lasers',
  description: 'Arms ~1 in 4 of your helpers with a piercing laser beam.',
  tiers: [{ cost: 60, value: 1 }],
})

export const laser: HelperWeaponDefinition = {
  kind: HelperWeaponKind.laser,
  meta: { icon: IconName.laser, label: 'Laser' },
  fireRateMultiplier: LASER.fireRateMultiplier,
  weaponDamage: (baseDamage) => baseDamage * LASER.damageMultiplier,
  createProjectiles: (shipPos, targetPos, damage) => [
    buildHelperProjectile(shipPos, targetPos, damage, {
      speed: LASER.speed,
      lifetime: LASER.lifetime,
      pierce: { maxHits: LASER.basePierce, hitEnemyIds: [] },
    }),
  ],
  unlockUpgrade,
}
