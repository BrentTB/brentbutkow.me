import { SHIELD_COOLDOWN } from '../../data'
import { canEnemyTakeDamage } from '../bosses/index'
import { distance } from '../math/collision'
import { clamp } from '../math/utils'
import { createParticle } from './entity-creator'
import { EscapeModePhase } from '../types'
import type { Enemy, Particle, PlayerUpgrades, Projectile, Ship, Vec2 } from '../types'
import { ESCAPE_MODE } from '../spaceMetalAbilities/escape-mode'
import { SHIP_WEAPON_DEFINITIONS } from '../ship'

// Keeps the ship's centre fully inside the world rect (accounting for its
// radius). Escape Mode moves the ship directly instead of via patrol, so it
// has to enforce the bounds patrol would otherwise keep it within.
function clampToWorld(pos: Vec2, radius: number, world: Vec2): Vec2 {
  return {
    x: clamp(pos.x, radius, world.x - radius),
    y: clamp(pos.y, radius, world.y - radius),
  }
}

export function applyDamageToShip(ship: Ship, damage: number): Ship {
  if (damage <= 0) return ship
  // Escape Mode grants full damage immunity to both HP and shield.
  if (ship.escapeMode !== null) return ship
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

// Drives Escape Mode each tick. Returns the updated ship plus any flame trail
// particles spawned this frame. When escape is over the field is nulled out.
export function tickEscapeMode(
  ship: Ship,
  dt: number,
  trailAccumulator: number,
  worldSize: Vec2
): { ship: Ship; particles: Particle[]; trailAccumulator: number } {
  if (ship.escapeMode === null) {
    return { ship, particles: [], trailAccumulator: 0 }
  }

  const e = ship.escapeMode
  const timer = e.timer - dt
  const particles: Particle[] = []
  let nextAcc = trailAccumulator

  if (e.phase === EscapeModePhase.charge) {
    const speed = ship.speed * ESCAPE_MODE.chargeSpeedMultiplier
    const vel = { x: e.heading.x * speed, y: e.heading.y * speed }
    const pos = clampToWorld(
      { x: ship.pos.x + vel.x * dt, y: ship.pos.y + vel.y * dt },
      ship.radius,
      worldSize
    )
    if (timer <= 0) {
      return {
        ship: {
          ...ship,
          pos,
          vel,
          lastHeading: e.heading,
          escapeMode: {
            phase: EscapeModePhase.dash,
            timer: ESCAPE_MODE.dashDuration,
            heading: e.heading,
          },
        },
        particles,
        trailAccumulator: 0,
      }
    }
    return {
      ship: { ...ship, pos, vel, lastHeading: e.heading, escapeMode: { ...e, timer } },
      particles,
      trailAccumulator: nextAcc,
    }
  }

  // Dash phase — fast straight line + flame trail.
  const speed = ship.speed * ESCAPE_MODE.dashSpeedMultiplier
  const vel = { x: e.heading.x * speed, y: e.heading.y * speed }
  const pos = clampToWorld(
    { x: ship.pos.x + vel.x * dt, y: ship.pos.y + vel.y * dt },
    ship.radius,
    worldSize
  )

  nextAcc += dt
  while (nextAcc >= ESCAPE_MODE.trailInterval) {
    nextAcc -= ESCAPE_MODE.trailInterval
    particles.push(
      createParticle(
        pos,
        { x: -vel.x * 0.15, y: -vel.y * 0.15 },
        ESCAPE_MODE.trailColor,
        ESCAPE_MODE.trailLifetime,
        ESCAPE_MODE.trailSize
      )
    )
  }

  if (timer <= 0) {
    return {
      ship: { ...ship, pos, vel, lastHeading: e.heading, escapeMode: null },
      particles,
      trailAccumulator: 0,
    }
  }
  return {
    ship: { ...ship, pos, vel, lastHeading: e.heading, escapeMode: { ...e, timer } },
    particles,
    trailAccumulator: nextAcc,
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

  const speedMag = Math.hypot(velX, velY)
  const lastHeading =
    speedMag > 0.01 ? { x: velX / speedMag, y: velY / speedMag } : ship.lastHeading

  return {
    ...ship,
    pos: { x: ship.pos.x + velX * dt, y: ship.pos.y + velY * dt },
    vel: { x: velX, y: velY },
    patrolAngle: angle,
    lastHeading,
  }
}

export function updateShipAttack(
  ship: Ship,
  enemies: Enemy[],
  projectiles: Projectile[],
  dt: number,
  upgrades: PlayerUpgrades
): { ship: Ship; projectiles: Projectile[] } {
  // Each slot ticks down independently — a slow Nuke slot doesn't block a fast
  // Bullet slot on the same Carrier.
  const fireCooldowns = ship.fireCooldowns.map((c) => Math.max(0, c - dt))

  if (enemies.length === 0) {
    return { ship: { ...ship, fireCooldowns }, projectiles }
  }

  // Nearest in-range enemies, sorted by distance. A slot picks its target as
  // the slot-index-th entry (so 3 ready slots fire at 3 distinct enemies); if
  // fewer enemies than slots, multiple slots fall back to the nearest.
  // Invincible enemies (a shielded boss) are skipped — no point shooting what
  // can't be hurt; the ship targets generators / other enemies instead, and
  // holds fire if nothing damageable is in range.
  const inRange = enemies
    .map((e) => ({ enemy: e, dist: distance(ship.pos, e.pos) }))
    .filter((x) => x.dist < ship.attackRange && canEnemyTakeDamage(x.enemy, enemies))
    .sort((a, b) => a.dist - b.dist)
  if (inRange.length === 0) {
    return { ship: { ...ship, fireCooldowns }, projectiles }
  }

  let nextProjectiles = projectiles
  for (let i = 0; i < ship.weaponSlots; i++) {
    if (fireCooldowns[i] > 0) continue
    const kind = ship.equippedWeapons[i] ?? ship.equippedWeapons[0]
    const def = SHIP_WEAPON_DEFINITIONS[kind]
    const target = inRange[Math.min(i, inRange.length - 1)].enemy
    const damage = def.weaponDamage(ship.damage, upgrades)
    const spawned = def.createProjectiles(ship.pos, target.pos, damage, upgrades)
    nextProjectiles = [...nextProjectiles, ...spawned]
    fireCooldowns[i] = 1 / (ship.fireRate * def.fireRateMultiplier)
  }

  return { ship: { ...ship, fireCooldowns }, projectiles: nextProjectiles }
}
