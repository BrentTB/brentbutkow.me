import { SHIELD_COOLDOWN } from '../../data'
import { distance } from '../math/collision'
import { createProjectile } from './entityCreator'
import { ProjectileOwner } from '../types'
import type { Enemy, Projectile, Ship, Vec2 } from '../types'

export function applyDamageToShip(ship: Ship, damage: number): Ship {
  if (damage <= 0) return ship
  const shieldAbsorb = Math.min(ship.shield, damage)
  const hpDamage = damage - shieldAbsorb
  return {
    ...ship,
    shield: ship.shield - shieldAbsorb,
    // Any hit to the shield resets the regen timer — healing only begins after
    // 3 seconds with no damage taken.
    shieldCooldownRemaining: shieldAbsorb > 0 ? SHIELD_COOLDOWN : ship.shieldCooldownRemaining,
    hp: ship.hp - hpDamage,
  }
}

export function updateShipPatrol(ship: Ship, dt: number, worldSize: Vec2): Ship {
  const angle = ship.patrolAngle + dt * 0.4
  const cx = worldSize.x / 2
  const cy = worldSize.y / 2
  const orbitX = 200
  const orbitY = 120

  const targetX = cx + Math.sin(angle) * orbitX
  const targetY = cy + Math.sin(angle * 2) * orbitY

  const dx = targetX - ship.pos.x
  const dy = targetY - ship.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const speed = Math.min(ship.speed, dist / dt)

  const velX = dist > 0.1 ? (dx / dist) * speed : 0
  const velY = dist > 0.1 ? (dy / dist) * speed : 0

  return {
    ...ship,
    pos: { x: ship.pos.x + velX * dt, y: ship.pos.y + velY * dt },
    vel: { x: velX, y: velY },
    patrolAngle: angle,
  }
}

export function updateShipAttack(
  ship: Ship,
  enemies: Enemy[],
  projectiles: Projectile[],
  dt: number
): { ship: Ship; projectiles: Projectile[] } {
  let cooldown = ship.fireCooldown - dt

  if (cooldown <= 0 && enemies.length > 0) {
    // Sort enemies in range by distance and take up to weaponSlots targets
    const inRange = enemies
      .map((e) => ({ enemy: e, dist: distance(ship.pos, e.pos) }))
      .filter((x) => x.dist < ship.attackRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, ship.weaponSlots)

    if (inRange.length > 0) {
      for (const { enemy } of inRange) {
        projectiles = [
          ...projectiles,
          createProjectile(ship.pos, enemy.pos, ProjectileOwner.ship, ship.damage),
        ]
      }
      cooldown = 1 / ship.fireRate
    }
  }

  return {
    ship: { ...ship, fireCooldown: Math.max(0, cooldown) },
    projectiles,
  }
}
