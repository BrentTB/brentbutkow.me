import { ENEMY_STATS } from '../../data'
import { checkCollision, distance, segmentIntersectsCircle } from '../math/collision'
import { spawnExplosionParticles } from '../entities/entityCreator'
import { applyDamageToShip } from '../entities/ship'
import { DeathBehavior, EffectKind, ProjectileOwner } from '../types'
import type { ActiveEffect, Ally, Enemy, Particle, Projectile, Ship } from '../types'

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

export function resolveEnemyShipCollisions(
  enemies: Enemy[],
  ship: Ship
): { enemies: Enemy[]; ship: Ship; particles: Particle[]; killedEnemies: Enemy[] } {
  const allParticles: Particle[] = []
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  let damagedShip = ship

  for (const enemy of enemies) {
    if (checkCollision(enemy, damagedShip)) {
      damagedShip = applyDamageToShip(damagedShip, enemy.damage)
      killedEnemies.push(enemy)
      allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff2222'))
    } else {
      surviving.push(enemy)
    }
  }

  return { enemies: surviving, ship: damagedShip, particles: allParticles, killedEnemies }
}

// Enemies that contact an ally die (same as ship-collision behavior) and the
// ally takes the enemy's damage value.
export function resolveEnemyAllyMeleeCollisions(
  enemies: Enemy[],
  allies: Ally[]
): { enemies: Enemy[]; allies: Ally[]; particles: Particle[]; killedEnemies: Enemy[] } {
  const allParticles: Particle[] = []
  const survivingEnemies: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const updatedAllies = allies.map((a) => ({ ...a }))

  for (const enemy of enemies) {
    let consumed = false
    for (let i = 0; i < updatedAllies.length; i++) {
      const ally = updatedAllies[i]
      if (ally.hp <= 0) continue
      const dx = enemy.pos.x - ally.pos.x
      const dy = enemy.pos.y - ally.pos.y
      if (dx * dx + dy * dy < (enemy.radius + ally.radius) ** 2) {
        updatedAllies[i] = { ...ally, hp: ally.hp - enemy.damage }
        killedEnemies.push(enemy)
        allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff8866'))
        consumed = true
        break
      }
    }
    if (!consumed) survivingEnemies.push(enemy)
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
  activeEffects: ActiveEffect[]
): { shipDamage: number; particles: Particle[] } {
  let shipDamage = 0
  const particles: Particle[] = []

  // Shields the ship is currently sheltering inside. A bomber outside one of
  // these shields can't damage the ship — the dome eats the explosion.
  const shelteringShields = activeEffects.filter((e) => {
    if (e.kind !== EffectKind.shield) return false
    return distance(ship.pos, e.pos) < e.radius
  })

  for (const enemy of killedEnemies) {
    if (enemy.deathBehavior !== DeathBehavior.explode) continue

    const stats = ENEMY_STATS[enemy.kind]
    if (!('explosionDamage' in stats)) continue

    const dist = distance(enemy.pos, ship.pos)
    if (dist < stats.explosionRadius) {
      // Blocked iff the bomber is OUTSIDE a shield the ship is sheltering in.
      const blocked = shelteringShields.some(
        (s) => s.kind === EffectKind.shield && distance(enemy.pos, s.pos) >= s.radius
      )
      if (!blocked) {
        shipDamage += stats.explosionDamage
      }
      particles.push(...spawnExplosionParticles(enemy.pos, 20, '#ff8833'))
    } else {
      particles.push(...spawnExplosionParticles(enemy.pos, 14, '#ff6622'))
    }
  }

  return { shipDamage, particles }
}
