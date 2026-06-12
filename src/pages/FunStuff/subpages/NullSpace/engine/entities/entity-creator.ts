import {
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  ENEMY_STATS,
  SLINGSHOT,
} from '../../data'
import { HELPER } from '../abilities/ability-data'
import { DeathBehavior, EnemyKind, MovementBehavior, ShipKind, ShipWeaponKind } from '../types'
import type { Ship, Enemy, Projectile, Vec2, Ally, Particle } from '../types'
import { rng } from '../math/random'
import { SHIP_VARIANTS } from '../ship/ship-data'
import { getBossDefinition } from '../bosses/index'
import type { BossEnemyKind } from '../bosses/boss-definition'

// Bosses aren't listed here — they declare movement on their BossDefinition
// and always die with DeathBehavior.boss. Exhaustive over the remaining kinds.
type NonBossEnemyKind = Exclude<EnemyKind, BossEnemyKind>

const ENEMY_MOVEMENT: Record<NonBossEnemyKind, MovementBehavior> = {
  [EnemyKind.drone]: MovementBehavior.chase,
  [EnemyKind.tank]: MovementBehavior.chase,
  [EnemyKind.shooter]: MovementBehavior.keepRange,
  [EnemyKind.swarm]: MovementBehavior.zigzag,
  [EnemyKind.bomber]: MovementBehavior.chase,
  [EnemyKind.shieldGenerator]: MovementBehavior.stationary,
  [EnemyKind.wormSegment]: MovementBehavior.none,
}

const ENEMY_DEATH: Record<NonBossEnemyKind, DeathBehavior> = {
  [EnemyKind.drone]: DeathBehavior.none,
  [EnemyKind.tank]: DeathBehavior.none,
  [EnemyKind.shooter]: DeathBehavior.none,
  [EnemyKind.swarm]: DeathBehavior.none,
  [EnemyKind.bomber]: DeathBehavior.explode,
  [EnemyKind.shieldGenerator]: DeathBehavior.none,
  [EnemyKind.wormSegment]: DeathBehavior.none,
}

// IDs must be unique across the whole session — including across Vite HMR
// reloads, which would reset a module-scoped counter. crypto.randomUUID is the
// ideal source but only exists in secure contexts (HTTPS/localhost); on a plain-
// HTTP origin (e.g. a LAN IP for mobile testing) it's undefined, so fall back to
// a random-suffixed id that's still collision-safe across reloads.
let uidFallback = 0
export function uid(): string {
  const id = crypto.randomUUID?.()
  if (id) return id
  uidFallback += 1
  return `e${uidFallback}-${Math.random().toString(36).slice(5)}`
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
    hpRegen: 0,
    fireRate: s.fireRate,
    fireCooldowns: Array(s.weaponSlots).fill(0),
    damage: s.damage,
    speed: s.speed,
    attackRange: s.attackRange,
    patrolAngle: 0,
    weaponSlots: s.weaponSlots,
    equippedWeapons: Array(s.weaponSlots).fill(ShipWeaponKind.bullet),
    lastHeading: { x: 1, y: 0 },
    escapeMode: null,
    flingVel: { x: 0, y: 0 },
    slingMaxSpeed: SLINGSHOT.baseSpeed,
    slingJitter: SLINGSHOT.baseJitter,
    slingCooldown: SLINGSHOT.baseCooldown,
    slingCooldownRemaining: 0,
    slingCoolRate: SLINGSHOT.baseCoolRate,
    slingHeat: 0,
    slingOverheated: false,
  }
}

export function createEnemy(kind: Enemy['kind'], pos: Vec2): Enemy {
  const stats = ENEMY_STATS[kind]
  // bossDef === undefined means `kind` is a non-boss kind; TypeScript can't
  // correlate the two, hence the casts on the table lookups.
  const bossDef = getBossDefinition(kind)
  const base: Enemy = {
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
    movementBehavior: bossDef?.movement ?? ENEMY_MOVEMENT[kind as NonBossEnemyKind],
    deathBehavior: bossDef ? DeathBehavior.boss : ENEMY_DEATH[kind as NonBossEnemyKind],
    age: 0,
  }
  if (bossDef) base.boss = bossDef.initialState()
  return base
}

export function createProjectile(
  pos: Vec2,
  targetPos: Vec2,
  owner: Projectile['owner'],
  damage: number,
  opts?: { speed?: number; beam?: boolean }
): Projectile {
  const dx = targetPos.x - pos.x
  const dy = targetPos.y - pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 1
  const speed = opts?.speed ?? PROJECTILE_SPEED

  return {
    id: uid(),
    pos: { ...pos },
    prevPos: { ...pos },
    vel: { x: nx * speed, y: ny * speed },
    radius: PROJECTILE_RADIUS,
    hp: 1,
    maxHp: 1,
    owner,
    damage,
    lifetime: PROJECTILE_LIFETIME,
    ...(opts?.beam ? { beam: true } : {}),
  }
}

export function createAlly(
  pos: Vec2,
  maxHp: number = HELPER.hp,
  damage: number = HELPER.damage
): Ally {
  return {
    id: uid(),
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    radius: HELPER.radius,
    hp: maxHp,
    maxHp,
    fireRate: HELPER.fireRate,
    fireCooldown: 0,
    damage,
    speed: HELPER.speed,
    attackRange: HELPER.attackRange,
    elapsed: 0,
  }
}

// A Helper Factory ally (Helper ultimate): bigger, tankier, deals no damage —
// `spawnInterval`/`spawnTimer` mark it as a factory so updateAllies spawns
// helpers from it on a timer instead of shooting.
export function createHelperFactory(pos: Vec2, maxHp: number, spawnInterval: number): Ally {
  return {
    ...createAlly(pos, maxHp, 0),
    radius: HELPER.radius * 2,
    spawnInterval,
    spawnTimer: spawnInterval,
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
