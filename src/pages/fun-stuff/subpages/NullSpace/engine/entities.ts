import {
  SHIP_DEFAULTS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  METEORITE_STRIKE,
  METEOR_STRIKE,
  BLACK_HOLE,
} from '../data'
import { AbilityKind, EnemyKind } from './types'
import type { Ship, Enemy, Projectile, Vec2, Ability, Particle } from './types'
import { rng } from './random'

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

type EnemyConfig = {
  hp: number
  speed: number
  damage: number
  radius: number
  scoreValue: number
  powerReward: number
  fireRate: number
  attackRange: number
}

const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  [EnemyKind.drone]: {
    hp: 20,
    speed: 100,
    damage: 8,
    radius: 10,
    scoreValue: 10,
    powerReward: 5,
    fireRate: 0,
    attackRange: 0,
  },
  [EnemyKind.tank]: {
    hp: 80,
    speed: 40,
    damage: 15,
    radius: 18,
    scoreValue: 30,
    powerReward: 15,
    fireRate: 0,
    attackRange: 0,
  },
  [EnemyKind.shooter]: {
    hp: 30,
    speed: 50,
    damage: 6,
    radius: 12,
    scoreValue: 20,
    powerReward: 8,
    fireRate: 0.8,
    attackRange: 350,
  },
}

export function createEnemy(kind: Enemy['kind'], pos: Vec2): Enemy {
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
    fireRate: config.fireRate,
    fireCooldown: 0,
    attackRange: config.attackRange,
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
      kind: AbilityKind.meteorite,
      cooldown: METEORITE_STRIKE.cooldown,
      cooldownRemaining: 0,
      powerCost: METEORITE_STRIKE.powerCost,
      damage: METEORITE_STRIKE.damage,
      aoeRadius: METEORITE_STRIKE.aoeRadius,
      unlocked: true,
    },
    {
      kind: AbilityKind.blackHole,
      cooldown: BLACK_HOLE.cooldown,
      cooldownRemaining: 0,
      powerCost: BLACK_HOLE.powerCost,
      damage: BLACK_HOLE.damage,
      aoeRadius: BLACK_HOLE.radius,
      unlocked: false,
    },
    {
      kind: AbilityKind.meteor,
      cooldown: METEOR_STRIKE.cooldown,
      cooldownRemaining: 0,
      powerCost: METEOR_STRIKE.powerCost,
      damage: METEOR_STRIKE.damage,
      aoeRadius: METEOR_STRIKE.aoeRadius,
      unlocked: false,
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
