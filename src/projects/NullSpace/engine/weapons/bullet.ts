import { createProjectile } from '../entities/entity-creator'
import { ProjectileOwner, HelperWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { BULLET } from './helper-weapon-data'
import type { HelperWeaponDefinition } from './helper-weapon-definition'

export const bullet: HelperWeaponDefinition = {
  kind: HelperWeaponKind.bullet,
  meta: { icon: IconName.bullet, label: 'Bullet' },
  startsUnlocked: true,
  fireRateMultiplier: BULLET.fireRateMultiplier,
  weaponDamage: (baseDamage) => baseDamage * BULLET.damageMultiplier,
  // Default weapon — a plain projectile, no special behavior fields.
  createProjectiles: (shipPos, targetPos, damage) => [
    createProjectile(shipPos, targetPos, ProjectileOwner.ship, damage),
  ],
}
