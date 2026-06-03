import {
  SHIP_VARIANTS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  METEORITE_STRIKE,
  METEOR_STRIKE,
  BLACK_HOLE,
  ROCKET,
  SHIELD,
  SUN,
  WEAPON_ORDER,
  ENEMY_STATS,
} from '../data'
import { AbilityKind, DeathBehavior, EnemyKind, MovementBehavior, ShipKind } from './types'
import type { Ship, Enemy, Projectile, Vec2, Ability, Particle } from './types'
import { rng } from './random'

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
    vel: { x: nx * PROJECTILE_SPEED, y: ny * PROJECTILE_SPEED },
    radius: PROJECTILE_RADIUS,
    hp: 1,
    maxHp: 1,
    owner,
    damage,
    lifetime: PROJECTILE_LIFETIME,
  }
}

// Per-kind base config. Each entry defines the ability's starting stats; the order
// of display is decided by WEAPON_ORDER (data.ts), NOT by sort.
const ABILITY_BASE: Record<AbilityKind, () => Omit<Ability, 'cooldownRemaining' | 'unlocked'>> = {
  [AbilityKind.meteorite]: () => ({
    kind: AbilityKind.meteorite,
    cooldown: METEORITE_STRIKE.cooldown,
    powerCost: METEORITE_STRIKE.powerCost,
    damage: METEORITE_STRIKE.damage,
    aoeRadius: METEORITE_STRIKE.aoeRadius,
  }),
  [AbilityKind.meteor]: () => ({
    kind: AbilityKind.meteor,
    cooldown: METEOR_STRIKE.cooldown,
    powerCost: METEOR_STRIKE.powerCost,
    damage: METEOR_STRIKE.damage,
    aoeRadius: METEOR_STRIKE.aoeRadius,
  }),
  [AbilityKind.blackHole]: () => ({
    kind: AbilityKind.blackHole,
    cooldown: BLACK_HOLE.cooldown,
    powerCost: BLACK_HOLE.powerCost,
    damage: BLACK_HOLE.damage,
    aoeRadius: BLACK_HOLE.radius,
    duration: BLACK_HOLE.duration,
  }),
  [AbilityKind.rocket]: () => ({
    kind: AbilityKind.rocket,
    cooldown: ROCKET.cooldown,
    powerCost: ROCKET.powerCost,
    damage: ROCKET.damage,
    aoeRadius: ROCKET.aoeRadius,
  }),
  [AbilityKind.shield]: () => ({
    kind: AbilityKind.shield,
    cooldown: SHIELD.cooldown,
    powerCost: SHIELD.powerCost,
    // Shield no longer deals damage — it's a movement barrier. The Ability
    // shape still requires `damage`, so we set 0.
    damage: 0,
    aoeRadius: SHIELD.radius,
    duration: SHIELD.duration,
  }),
  [AbilityKind.sun]: () => ({
    kind: AbilityKind.sun,
    cooldown: SUN.cooldown,
    powerCost: SUN.powerCost,
    damage: SUN.damagePerSec,
    aoeRadius: SUN.radius,
    duration: SUN.duration,
  }),
}

export function createAbilities(): Ability[] {
  return WEAPON_ORDER.map((kind) => ({
    ...ABILITY_BASE[kind](),
    cooldownRemaining: 0,
    // Meteorite starts unlocked; everything else needs a shop purchase.
    unlocked: kind === AbilityKind.meteorite,
  }))
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
