import { ENEMY_STATS } from '../../data'
import { distance } from '../math/collision'
import { createProjectile } from './entityCreator'
import { MovementBehavior, ProjectileOwner } from '../types'
import type { Ally, Enemy, Projectile, Ship, Vec2 } from '../types'

// Returns the position of the nearest entity to a given point (ship or any ally).
export function findNearestTarget(pos: Vec2, ship: Ship, allies: Ally[]): Vec2 {
  let nearest = ship.pos
  let nearestDist = distance(pos, ship.pos)
  for (const ally of allies) {
    const d = distance(pos, ally.pos)
    if (d < nearestDist) {
      nearest = ally.pos
      nearestDist = d
    }
  }
  return nearest
}

type MoveFn = (enemy: Enemy, ship: Ship, dt: number) => Enemy

function moveChase(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const dx = ship.pos.x - enemy.pos.x
  const dy = ship.pos.y - enemy.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  const targetVx = (dx / dist) * enemy.speed
  const targetVy = (dy / dist) * enemy.speed

  // Smooth velocity toward the target so slow chasers (tanks) don't jitter when
  // the ship reverses on its patrol. Heavier enemies turn more slowly: rate
  // scales with their movement speed.
  const turnRate = enemy.speed / 30
  const alpha = 1 - Math.exp(-turnRate * dt)
  const vx = enemy.vel.x + (targetVx - enemy.vel.x) * alpha
  const vy = enemy.vel.y + (targetVy - enemy.vel.y) * alpha

  return {
    ...enemy,
    pos: { x: enemy.pos.x + vx * dt, y: enemy.pos.y + vy * dt },
    vel: { x: vx, y: vy },
  }
}

function moveKeepRange(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const dx = ship.pos.x - enemy.pos.x
  const dy = ship.pos.y - enemy.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  if (dist < enemy.attackRange * 0.7) {
    return { ...enemy, vel: { x: 0, y: 0 } }
  }

  const nx = dx / dist
  const ny = dy / dist
  return {
    ...enemy,
    pos: {
      x: enemy.pos.x + nx * enemy.speed * dt,
      y: enemy.pos.y + ny * enemy.speed * dt,
    },
    vel: { x: nx * enemy.speed, y: ny * enemy.speed },
  }
}

function moveZigzag(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const dx = ship.pos.x - enemy.pos.x
  const dy = ship.pos.y - enemy.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  const nx = dx / dist
  const ny = dy / dist

  // Hash the numeric suffix of the ID for a per-enemy phase offset so pack
  // members don't weave in lockstep. The oscillation is driven by the enemy's
  // own age (game time, speed-scaled) rather than wall-clock, keeping it
  // deterministic and in sync with the game-speed setting.
  const idNum = parseInt(enemy.id.slice(1), 10) || 0
  const phase = idNum * 2.39996
  const lateralStrength = Math.sin(enemy.age * 5 + phase) * 0.6

  const mx = nx + -ny * lateralStrength
  const my = ny + nx * lateralStrength
  const mDist = Math.sqrt(mx * mx + my * my)
  const fmx = mDist > 0 ? mx / mDist : 0
  const fmy = mDist > 0 ? my / mDist : 0

  return {
    ...enemy,
    pos: {
      x: enemy.pos.x + fmx * enemy.speed * dt,
      y: enemy.pos.y + fmy * enemy.speed * dt,
    },
    vel: { x: fmx * enemy.speed, y: fmy * enemy.speed },
  }
}

const MOVEMENT_FN: Record<MovementBehavior, MoveFn> = {
  [MovementBehavior.chase]: moveChase,
  [MovementBehavior.keepRange]: moveKeepRange,
  [MovementBehavior.zigzag]: moveZigzag,
}

export function updateEnemyMovement(
  enemies: Enemy[],
  ship: Ship,
  allies: Ally[],
  dt: number
): Enemy[] {
  return enemies.map((enemy) => {
    const target = findNearestTarget(enemy.pos, ship, allies)
    const targetAsShip = { ...ship, pos: target }
    const moved = MOVEMENT_FN[enemy.movementBehavior](enemy, targetAsShip, dt)
    return { ...moved, age: enemy.age + dt }
  })
}

export function updateEnemyShooting(
  enemies: Enemy[],
  ship: Ship,
  allies: Ally[],
  projectiles: Projectile[],
  dt: number
): { enemies: Enemy[]; projectiles: Projectile[] } {
  const updatedEnemies: Enemy[] = []
  let newProjectiles = projectiles

  for (const enemy of enemies) {
    if (enemy.fireRate <= 0) {
      updatedEnemies.push(enemy)
      continue
    }

    let cooldown = enemy.fireCooldown - dt
    if (cooldown <= 0) {
      const target = findNearestTarget(enemy.pos, ship, allies)
      const dist = distance(enemy.pos, target)
      if (dist < enemy.attackRange) {
        const projDamage = ENEMY_STATS.shooter.projectileDamage
        const proj = createProjectile(enemy.pos, target, ProjectileOwner.enemy, projDamage)
        newProjectiles = [...newProjectiles, proj]
        cooldown = 1 / enemy.fireRate
      }
    }
    updatedEnemies.push({ ...enemy, fireCooldown: Math.max(0, cooldown) })
  }

  return { enemies: updatedEnemies, projectiles: newProjectiles }
}
