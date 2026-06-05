import {
  SHIP_VARIANTS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  ENEMY_STATS,
} from '../../data'
import { HELPER } from '../abilities/abilityData'
import { DeathBehavior, EnemyKind, MovementBehavior, ShipKind } from '../types'
import type { Ship, Enemy, Projectile, Vec2, Ally, Particle } from '../types'
import { rng } from '../math/random'

const ENEMY_MOVEMENT: Record<EnemyKind, MovementBehavior> = {
  [EnemyKind.drone]: MovementBehavior.chase,
  [EnemyKind.tank]: MovementBehavior.chase,
  [EnemyKind.shooter]: MovementBehavior.keepRange,
  [EnemyKind.swarm]: MovementBehavior.zigzag,
  [EnemyKind.bomber]: MovementBehavior.chase,
}

const ENEMY_DEATH: Record<EnemyKind, DeathBehavior> = {
  [EnemyKind.drone]: DeathBehavior.none,
  [EnemyKind.tank]: DeathBehavior.none,
  [EnemyKind.shooter]: DeathBehavior.none,
  [EnemyKind.swarm]: DeathBehavior.none,
  [EnemyKind.bomber]: DeathBehavior.explode,
}

let nextId = 0
export function uid(): string {
  return `e${nextId++}`
}

export function resetUid(): void {
  nextId = 0
}

export function createShip(kind: ShipKind, worldSize: Vec2): Ship {
  const s = SHIP_VARIANTS[kind].stats
  return {
    id: uid(),
    kind,
    pos: { x: worldSize.x / 2, y: worldSize.y / 2 },
    vel: { x: 0, y: 0 },
    radius: s.radius,
    hp: s.maxHp,
    maxHp: s.maxHp,
    shield: s.maxShield,
    maxShield: s.maxShield,
    shieldRegen: s.shieldRegen,
    shieldCooldownRemaining: 0,
    fireRate: s.fireRate,
    fireCooldown: 0,
    damage: s.damage,
    speed: s.speed,
    attackRange: s.attackRange,
    patrolAngle: 0,
    weaponSlots: s.weaponSlots,
  }
}

export function createEnemy(kind: Enemy['kind'], pos: Vec2): Enemy {
  const stats = ENEMY_STATS[kind]
  return {
    id: uid(),
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    radius: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    kind,
    speed: stats.speed,
    damage: stats.damage,
    scoreValue: stats.scoreValue,
    powerReward: stats.powerReward,
    fireRate: 'fireRate' in stats ? stats.fireRate : 0,
    fireCooldown: 0,
    attackRange: 'attackRange' in stats ? stats.attackRange : 0,
    movementBehavior: ENEMY_MOVEMENT[kind],
    deathBehavior: ENEMY_DEATH[kind],
    age: 0,
  }
}

export function createProjectile(
  pos: Vec2,
  targetPos: Vec2,
  owner: Projectile['owner'],
  damage: number
): Projectile {
  const dx = targetPos.x - pos.x
  const dy = targetPos.y - pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 1

  return {
    id: uid(),
    pos: { ...pos },
    prevPos: { ...pos },
    vel: { x: nx * PROJECTILE_SPEED, y: ny * PROJECTILE_SPEED },
    radius: PROJECTILE_RADIUS,
    hp: 1,
    maxHp: 1,
    owner,
    damage,
    lifetime: PROJECTILE_LIFETIME,
  }
}

export function createAlly(pos: Vec2): Ally {
  return {
    id: uid(),
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    radius: HELPER.radius,
    hp: HELPER.hp,
    maxHp: HELPER.hp,
    fireRate: HELPER.fireRate,
    fireCooldown: 0,
    damage: HELPER.damage,
    speed: HELPER.speed,
    attackRange: HELPER.attackRange,
    elapsed: 0,
    duration: HELPER.duration,
  }
}

// Ability creation lives in engine/abilities/ to keep all per-ability logic in
// one folder. Re-exported here so existing callers don't break.
export { createAbilities } from '../abilities'

export function createParticle(
  pos: Vec2,
  vel: Vec2,
  color: string,
  lifetime: number,
  size: number
): Particle {
  return {
    id: uid(),
    pos: { ...pos },
    vel: { ...vel },
    lifetime,
    elapsed: 0,
    color,
    size,
  }
}

export function spawnExplosionParticles(pos: Vec2, count: number, color: string): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rng.range(-0.25, 0.25)
    const speed = 60 + rng.next() * 120
    particles.push(
      createParticle(
        { x: pos.x, y: pos.y },
        { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        color,
        0.4 + rng.next() * 0.4,
        2 + rng.next() * 3
      )
    )
  }
  return particles
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
      vel: { x: p.vel.x * 0.96, y: p.vel.y * 0.96 },
      elapsed: p.elapsed + dt,
    }))
    .filter((p) => p.elapsed < p.lifetime)
}
