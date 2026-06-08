import { PROJECTILE_RADIUS } from '../../data'
import { uid } from '../entities/entity-creator'
import { ProjectileOwner } from '../types'
import type { PlayerUpgrades, Projectile, ShipWeaponKind, UpgradeDefinition, Vec2 } from '../types'
import type { IconName } from '../../icon-names'

// The ship's auto-attack weapon, mirroring AbilityDefinition. A weapon owns its
// firing cadence multiplier, how it spawns projectiles (pre-tagged with
// behavior fields the combat system reads), the damage it does, and the
// upgrade definitions that unlock and modify it. Combat never imports this
// file — it dispatches on the projectile's optional fields.
export type ShipWeaponDefinition = {
  kind: ShipWeaponKind
  meta: { icon: IconName; label: string }
  // True only for the default weapon (bullet). Everything else needs its
  // `unlockUpgrade` purchased before it can be equipped.
  startsUnlocked?: boolean
  // Multiplier applied to `ship.fireRate` to compute this weapon's per-slot
  // cooldown (`1 / (ship.fireRate * multiplier)`). Nuke is ~0.15, missile
  // ~0.55, bullet 1.
  fireRateMultiplier: number
  // Live damage after upgrades, given the ship's base damage stat.
  weaponDamage: (baseShipDamage: number, upgrades: PlayerUpgrades) => number
  // Spawns the projectile(s) for a single target. Returns an array so a weapon
  // can emit more than one per target if ever needed; bullet returns 1.
  createProjectiles: (
    shipPos: Vec2,
    targetPos: Vec2,
    damage: number,
    upgrades: PlayerUpgrades
  ) => Projectile[]
  // One-tier purchase that unlocks the weapon. Absent for the default weapon.
  unlockUpgrade?: UpgradeDefinition
  // Tiered upgrades (damage, special stats).
  modifierUpgrades?: UpgradeDefinition[]
}

// Per-weapon options for building a ship projectile beyond the bullet defaults.
// Unset fields fall back to bullet's values (PROJECTILE_RADIUS / 1-hp).
export type WeaponProjectileOpts = {
  speed: number
  lifetime: number
  radius?: number
  pierce?: Projectile['pierce']
  homing?: boolean
  bounce?: Projectile['bounce']
  detonate?: Projectile['detonate']
}

// Builds a ship-owned projectile aimed from `shipPos` toward `targetPos`,
// pre-tagged with whichever behavior fields the caller passes. Shared by the
// non-bullet weapons (bullet still uses createProjectile to stay byte-identical
// to its original code path).
export function buildShipProjectile(
  shipPos: Vec2,
  targetPos: Vec2,
  damage: number,
  opts: WeaponProjectileOpts
): Projectile {
  const dx = targetPos.x - shipPos.x
  const dy = targetPos.y - shipPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 1
  return {
    id: uid(),
    pos: { ...shipPos },
    prevPos: { ...shipPos },
    vel: { x: nx * opts.speed, y: ny * opts.speed },
    radius: opts.radius ?? PROJECTILE_RADIUS,
    hp: 1,
    maxHp: 1,
    owner: ProjectileOwner.ship,
    damage,
    lifetime: opts.lifetime,
    ...(opts.pierce ? { pierce: opts.pierce } : {}),
    ...(opts.homing ? { homing: opts.homing } : {}),
    ...(opts.bounce ? { bounce: opts.bounce } : {}),
    ...(opts.detonate ? { detonate: opts.detonate } : {}),
  }
}
