import { createProjectile } from '../entities/entity-creator'
import { ProjectileOwner, ShipWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { BULLET } from './ship-weapon-data'
import type { ShipWeaponDefinition } from './ship-weapon-definition'

export const bullet: ShipWeaponDefinition = {
  kind: ShipWeaponKind.bullet,
  meta: { icon: IconName.bullet, label: 'Bullet' },
  startsUnlocked: true,
  fireRateMultiplier: BULLET.fireRateMultiplier,
  weaponDamage: (baseShipDamage) => baseShipDamage * BULLET.damageMultiplier,
  // Default weapon — identical to the original createProjectile path.
  createProjectiles: (shipPos, targetPos, damage) => [
    createProjectile(shipPos, targetPos, ProjectileOwner.ship, damage),
  ],
}
