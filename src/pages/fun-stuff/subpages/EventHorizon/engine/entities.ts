import {
  SHIP_DEFAULTS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  METEOR_STRIKE,
} from '../data'
import type { Ship, Enemy, EnemyKind, Projectile, Vec2, Ability, Particle } from './types'

let nextId = 0
export function uid(): string {
  return `e${nextId++}`
}

export function resetUid(): void {
  nextId = 0
}

export function createShip(worldSize: Vec2): Ship {
  return {
    id: uid(),
    pos: { x: worldSize.x / 2, y: worldSize.y / 2 },
    vel: { x: 0, y: 0 },
    radius: SHIP_DEFAULTS.radius,
    hp: SHIP_DEFAULTS.hp,
    maxHp: SHIP_DEFAULTS.maxHp,
    fireRate: SHIP_DEFAULTS.fireRate,
    fireCooldown: 0,
    damage: SHIP_DEFAULTS.damage,
    speed: SHIP_DEFAULTS.speed,
    attackRange: SHIP_DEFAULTS.attackRange,
    patrolAngle: 0,
  }
}

const ENEMY_CONFIGS: Record<
  EnemyKind,
  {
    hp: number
    speed: number
    damage: number
    radius: number
    scoreValue: number
    powerReward: number
  }
> = {
  drone: { hp: 20, speed: 100, damage: 8, radius: 10, scoreValue: 10, powerReward: 5 },
  tank: { hp: 80, speed: 40, damage: 15, radius: 18, scoreValue: 30, powerReward: 15 },
}

export function createEnemy(kind: EnemyKind, pos: Vec2): Enemy {
  const config = ENEMY_CONFIGS[kind]
  return {
    id: uid(),
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    radius: config.radius,
    hp: config.hp,
    maxHp: config.hp,
    kind,
    speed: config.speed,
    damage: config.damage,
    scoreValue: config.scoreValue,
    powerReward: config.powerReward,
  }
}

export function createProjectile(
  pos: Vec2,
  targetPos: Vec2,
  owner: 'ship' | 'player',
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
    vel: { x: nx * PROJECTILE_SPEED, y: ny * PROJECTILE_SPEED },
    radius: PROJECTILE_RADIUS,
    hp: 1,
    maxHp: 1,
    owner,
    damage,
    lifetime: PROJECTILE_LIFETIME,
  }
}

export function createAbilities(): Ability[] {
  return [
    {
      kind: 'meteorStrike',
      cooldown: METEOR_STRIKE.cooldown,
      cooldownRemaining: 0,
      powerCost: METEOR_STRIKE.powerCost,
    },
  ]
}

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
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const speed = 60 + Math.random() * 120
    particles.push(
      createParticle(
        { x: pos.x, y: pos.y },
        { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        color,
        0.4 + Math.random() * 0.4,
        2 + Math.random() * 3
      )
    )
  }
  return particles
}
