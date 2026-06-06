import { ENEMY_STATS } from '../../data'
import { checkCollision, distance, segmentIntersectsCircle } from '../math/collision'
import { spawnExplosionParticles } from '../entities/entity-creator'
import { applyDamageToShip } from '../entities/ship'
import { DeathBehavior, EffectKind, ProjectileOwner } from '../types'
import type { ActiveEffect, Ally, Enemy, Particle, Projectile, Ship, Vec2 } from '../types'

export function updateProjectiles(projectiles: Projectile[], dt: number): Projectile[] {
  return projectiles
    .map((p) => ({
      ...p,
      prevPos: p.pos,
      pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
      lifetime: p.lifetime - dt,
    }))
    .filter((p) => p.lifetime > 0)
}

export function resolveProjectileEnemyCollisions(
  projectiles: Projectile[],
  enemies: Enemy[]
): {
  projectiles: Projectile[]
  enemies: Enemy[]
  scoreGained: number
  killedEnemies: Enemy[]
  particles: Particle[]
} {
  // Track hit projectiles by OBJECT REFERENCE (not by id), so any chance of
  // duplicate ids (HMR resetting the uid counter mid-game, two bullets
  // accidentally sharing a string id, etc.) can't make a single hit splash-
  // remove other in-flight bullets.
  const hitProjectiles = new Set<Projectile>()
  const allParticles: Particle[] = []
  let scoreGained = 0

  const updatedEnemies = enemies.map((e) => ({ ...e }))

  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.ship) continue
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i]
      // Skip enemies that an earlier projectile already killed this tick — they
      // stay in the array until the dead filter at the bottom, but a corpse
      // shouldn't absorb a second bullet flying through the same space.
      if (enemy.hp <= 0) continue
      if (
        segmentIntersectsCircle(
          proj.prevPos ?? proj.pos,
          proj.pos,
          enemy.pos,
          enemy.radius + proj.radius
        )
      ) {
        hitProjectiles.add(proj)
        updatedEnemies[i] = { ...enemy, hp: enemy.hp - proj.damage }
        allParticles.push(...spawnExplosionParticles(enemy.pos, 6, '#ff4444'))
        break
      }
    }
  }

  const deadEnemies = updatedEnemies.filter((e) => e.hp <= 0)
  const killedEnemies: Enemy[] = []
  for (const dead of deadEnemies) {
    scoreGained += dead.scoreValue
    killedEnemies.push(dead)
    allParticles.push(...spawnExplosionParticles(dead.pos, 12, '#ffaa33'))
  }

  return {
    projectiles: projectiles.filter((p) => !hitProjectiles.has(p)),
    enemies: updatedEnemies.filter((e) => e.hp > 0),
    scoreGained,
    killedEnemies,
    particles: allParticles,
  }
}

export function resolveEnemyProjectileShipCollisions(
  projectiles: Projectile[],
  ship: Ship
): { projectiles: Projectile[]; ship: Ship; particles: Particle[] } {
  const allParticles: Particle[] = []
  const surviving: Projectile[] = []
  let damagedShip = ship

  for (const proj of projectiles) {
    if (
      proj.owner === ProjectileOwner.enemy &&
      segmentIntersectsCircle(
        proj.prevPos ?? proj.pos,
        proj.pos,
        damagedShip.pos,
        damagedShip.radius + proj.radius
      )
    ) {
      damagedShip = applyDamageToShip(damagedShip, proj.damage)
      allParticles.push(...spawnExplosionParticles(proj.pos, 4, '#ff6666'))
    } else {
      surviving.push(proj)
    }
  }

  return { projectiles: surviving, ship: damagedShip, particles: allParticles }
}

export function resolveEnemyProjectileAllyCollisions(
  projectiles: Projectile[],
  allies: Ally[]
): { projectiles: Projectile[]; allies: Ally[]; particles: Particle[] } {
  const allParticles: Particle[] = []
  const surviving: Projectile[] = []
  const updatedAllies = allies.map((a) => ({ ...a }))

  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.enemy) {
      surviving.push(proj)
      continue
    }
    let hit = false
    for (let i = 0; i < updatedAllies.length; i++) {
      const ally = updatedAllies[i]
      if (ally.hp <= 0) continue
      const dx = proj.pos.x - ally.pos.x
      const dy = proj.pos.y - ally.pos.y
      if (dx * dx + dy * dy < (proj.radius + ally.radius) ** 2) {
        updatedAllies[i] = { ...ally, hp: ally.hp - proj.damage }
        allParticles.push(...spawnExplosionParticles(proj.pos, 4, '#88ff88'))
        hit = true
        break
      }
    }
    if (!hit) surviving.push(proj)
  }

  return {
    projectiles: surviving,
    allies: updatedAllies.filter((a) => a.hp > 0),
    particles: allParticles,
  }
}

// Extra separation (beyond the touching radius) applied when a non-exploding
// enemy bumps the ship or an ally. Buys ~quarter-second of breathing room
// before the chase logic re-acquires and re-contacts, so a clinging enemy
// doesn't drain HP every frame.
const MELEE_KNOCKBACK_DISTANCE = 30
const MELEE_KNOCKBACK_SPEED = 180

function bounceEnemyAway(enemy: Enemy, targetPos: Vec2, targetRadius: number): Enemy {
  const dx = enemy.pos.x - targetPos.x
  const dy = enemy.pos.y - targetPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  // Dead-center hit (or floating-point dust) — pick an arbitrary direction
  // rather than divide by zero and stick the enemy to the target.
  const degenerate = dist < 0.0001
  const nx = degenerate ? 1 : dx / dist
  const ny = degenerate ? 0 : dy / dist
  const sep = enemy.radius + targetRadius + MELEE_KNOCKBACK_DISTANCE
  return {
    ...enemy,
    pos: { x: targetPos.x + nx * sep, y: targetPos.y + ny * sep },
    vel: { x: nx * MELEE_KNOCKBACK_SPEED, y: ny * MELEE_KNOCKBACK_SPEED },
  }
}

export function resolveEnemyShipCollisions(
  enemies: Enemy[],
  ship: Ship
): { enemies: Enemy[]; ship: Ship; particles: Particle[]; killedEnemies: Enemy[] } {
  const allParticles: Particle[] = []
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  let damagedShip = ship

  for (const enemy of enemies) {
    if (!checkCollision(enemy, damagedShip)) {
      surviving.push(enemy)
      continue
    }
    damagedShip = applyDamageToShip(damagedShip, enemy.damage)
    // Bombers commit suicide on contact; everything else just bounces.
    if (enemy.deathBehavior === DeathBehavior.explode) {
      killedEnemies.push(enemy)
      allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff2222'))
    } else {
      surviving.push(bounceEnemyAway(enemy, damagedShip.pos, damagedShip.radius))
      allParticles.push(...spawnExplosionParticles(enemy.pos, 4, '#ff6644'))
    }
  }

  return { enemies: surviving, ship: damagedShip, particles: allParticles, killedEnemies }
}

// Mirrors ship-collision rules: bombers explode on contact, other enemies deal
// damage and bounce off.
export function resolveEnemyAllyMeleeCollisions(
  enemies: Enemy[],
  allies: Ally[]
): { enemies: Enemy[]; allies: Ally[]; particles: Particle[]; killedEnemies: Enemy[] } {
  const allParticles: Particle[] = []
  const survivingEnemies: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const updatedAllies = allies.map((a) => ({ ...a }))

  for (const enemy of enemies) {
    let hitAllyIndex = -1
    for (let i = 0; i < updatedAllies.length; i++) {
      const ally = updatedAllies[i]
      if (ally.hp <= 0) continue
      const dx = enemy.pos.x - ally.pos.x
      const dy = enemy.pos.y - ally.pos.y
      if (dx * dx + dy * dy < (enemy.radius + ally.radius) ** 2) {
        hitAllyIndex = i
        break
      }
    }
    if (hitAllyIndex === -1) {
      survivingEnemies.push(enemy)
      continue
    }
    const ally = updatedAllies[hitAllyIndex]
    updatedAllies[hitAllyIndex] = { ...ally, hp: ally.hp - enemy.damage }
    if (enemy.deathBehavior === DeathBehavior.explode) {
      killedEnemies.push(enemy)
      allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff8866'))
    } else {
      survivingEnemies.push(bounceEnemyAway(enemy, ally.pos, ally.radius))
      allParticles.push(...spawnExplosionParticles(enemy.pos, 4, '#ffaa66'))
    }
  }

  return {
    enemies: survivingEnemies,
    allies: updatedAllies.filter((a) => a.hp > 0),
    particles: allParticles,
    killedEnemies,
  }
}

export function resolveDeathEffects(
  killedEnemies: Enemy[],
  ship: Ship,
  allies: Ally[],
  activeEffects: ActiveEffect[]
): { shipDamage: number; allies: Ally[]; particles: Particle[] } {
  let shipDamage = 0
  const particles: Particle[] = []
  const updatedAllies = allies.map((a) => ({ ...a }))

  const shields = activeEffects.filter((e) => e.kind === EffectKind.shield)

  // A target is shielded from a blast iff it shelters inside a dome the bomber
  // is outside of — the dome eats the explosion.
  const isBlocked = (targetPos: Vec2, enemyPos: Vec2): boolean =>
    shields.some(
      (s) => distance(targetPos, s.pos) < s.radius && distance(enemyPos, s.pos) >= s.radius
    )

  for (const enemy of killedEnemies) {
    if (enemy.deathBehavior !== DeathBehavior.explode) continue

    const stats = ENEMY_STATS[enemy.kind]
    if (!('explosionDamage' in stats)) continue

    let hitSomething = false

    if (distance(enemy.pos, ship.pos) < stats.explosionRadius) {
      hitSomething = true
      if (!isBlocked(ship.pos, enemy.pos)) shipDamage += stats.explosionDamage
    }

    for (let i = 0; i < updatedAllies.length; i++) {
      const ally = updatedAllies[i]
      if (ally.hp <= 0) continue
      if (distance(enemy.pos, ally.pos) < stats.explosionRadius) {
        hitSomething = true
        if (!isBlocked(ally.pos, enemy.pos)) {
          updatedAllies[i] = { ...ally, hp: ally.hp - stats.explosionDamage }
        }
      }
    }

    particles.push(
      ...spawnExplosionParticles(
        enemy.pos,
        hitSomething ? 20 : 14,
        hitSomething ? '#ff8833' : '#ff6622'
      )
    )
  }

  return { shipDamage, allies: updatedAllies.filter((a) => a.hp > 0), particles }
}
