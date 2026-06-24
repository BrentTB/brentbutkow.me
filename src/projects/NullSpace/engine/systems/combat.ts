import { ENEMY_STATS, WORM_CONTACT_IFRAME } from '../../data'
import { checkCollision, distance, segmentIntersectsCircle } from '../math/collision'
import { homeTowardTarget } from '../math/homing'
import { steerToward } from '../math/steering'
import { toroidalDelta } from '../math/toroid'
import { spawnExplosionParticles } from '../entities/entity-creator'
import { applyDamageToAlly } from '../entities/ally'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { applyDamageToShip } from '../entities/ship'
import { CHARM } from '../abilities/ability-data'
import { createNuclearWasteEffect } from '../weapons/nuke'
import { canEnemyTakeDamage } from '../bosses'
import { DeathBehavior, EffectKind, EnemyKind, ProjectileOwner } from '../types'
import type { ActiveEffect, Ally, Enemy, Particle, Projectile, Ship, Vec2 } from '../types'

// Where to aim to intercept a target moving at `targetVel`: its position plus its
// velocity over the time a projectile at `speed` needs to close the current gap. Pure
// pursuit (aiming at the live position) just curves in behind a drifting target and
// orbits without connecting; leading converges, so only a course change slips it.
function leadPoint(from: Vec2, targetPos: Vec2, targetVel: Vec2, speed: number): Vec2 {
  const { x: dx, y: dy } = toroidalDelta(from, targetPos)
  const t = Math.hypot(dx, dy) / speed
  return { x: targetPos.x + targetVel.x * t, y: targetPos.y + targetVel.y * t }
}

export function updateProjectiles(
  projectiles: Projectile[],
  enemies: Enemy[],
  dt: number,
  shipPos?: Vec2,
  shipVel?: Vec2
): Projectile[] {
  return projectiles
    .map((p) => {
      if (p.homing && enemies.length > 0) {
        // Re-aim toward the nearest DAMAGEABLE enemy each tick — skip invincible
        // targets (shielded boss) so the missile chases generators / others
        // instead. Speed taken from current vel magnitude so upgrades stick.
        let nearest: Enemy | null = null
        let nearestDist = Infinity
        for (const e of enemies) {
          if (!canEnemyTakeDamage(e, enemies)) continue
          const { x: dx, y: dy } = toroidalDelta(p.pos, e.pos)
          const d = dx * dx + dy * dy
          if (d < nearestDist) {
            nearestDist = d
            nearest = e
          }
        }
        // No damageable target — keep flying straight this tick.
        if (nearest) {
          const speed = Math.hypot(p.vel.x, p.vel.y) || 1
          const motion = homeTowardTarget(p.pos, nearest.pos, speed, dt)
          return {
            ...p,
            prevPos: p.pos,
            pos: motion.pos,
            vel: motion.vel,
            lifetime: p.lifetime - dt,
          }
        }
      }
      if (p.homingTurnRate !== undefined && shipPos) {
        // Capped homing toward where the ship is HEADING (its lead point), not where it
        // is — a pursuit just curves in behind a drifting ship and orbits, never
        // connecting. Leading converges on it; the turn cap means a slingshot (a hard
        // course change) still slips the shot.
        const speed = Math.hypot(p.vel.x, p.vel.y) || 1
        const target = shipVel ? leadPoint(p.pos, shipPos, shipVel, speed) : shipPos
        const heading = steerToward(
          p.pos,
          { x: p.vel.x / speed, y: p.vel.y / speed },
          target,
          p.homingTurnRate,
          dt
        )
        const vel = { x: heading.x * speed, y: heading.y * speed }
        return {
          ...p,
          prevPos: p.pos,
          pos: { x: p.pos.x + vel.x * dt, y: p.pos.y + vel.y * dt },
          vel,
          lifetime: p.lifetime - dt,
        }
      }
      return {
        ...p,
        prevPos: p.pos,
        pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
        lifetime: p.lifetime - dt,
      }
    })
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
  newEffects: ActiveEffect[]
} {
  // Track hit projectiles by OBJECT REFERENCE (not by id), so any chance of
  // duplicate ids (HMR resetting the uid counter mid-game, two bullets
  // accidentally sharing a string id, etc.) can't make a single hit splash-
  // remove other in-flight bullets.
  const hitProjectiles = new Set<Projectile>()
  const allParticles: Particle[] = []
  const newEffects: ActiveEffect[] = []
  let scoreGained = 0

  const updatedEnemies = enemies.map((e) => ({ ...e }))

  // The pierce/bounce branches mutate the projectile in place (hitEnemyIds,
  // vel, remaining, lifetime) on purpose: game-loop reuses the same projectile
  // objects frame to frame, so this is how per-projectile state carries forward.
  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.ship) continue

    // Pierce (laser): hit up to maxHits distinct enemies along this tick's
    // segment, accumulating hit ids on the projectile so the same enemy isn't
    // hit twice across frames. Doesn't break — pass-through is the point.
    if (proj.pierce) {
      const { maxHits, hitEnemyIds } = proj.pierce
      for (let i = 0; i < updatedEnemies.length; i++) {
        const enemy = updatedEnemies[i]
        if (enemy.hp <= 0) continue
        if (hitEnemyIds.includes(enemy.id)) continue
        if (
          !segmentIntersectsCircle(
            proj.prevPos ?? proj.pos,
            proj.pos,
            enemy.pos,
            enemy.radius + proj.radius
          )
        )
          continue
        // Shielded boss: laser phases through without dealing damage.
        if (!canEnemyTakeDamage(enemy, updatedEnemies)) {
          allParticles.push(...spawnExplosionParticles(enemy.pos, 3, '#4477aa'))
          continue
        }
        updatedEnemies[i] = applyDamageToEnemy(enemy, proj.damage)
        hitEnemyIds.push(enemy.id)
        allParticles.push(...spawnExplosionParticles(enemy.pos, 4, '#88ccff'))
        if (hitEnemyIds.length >= maxHits) {
          hitProjectiles.add(proj)
          break
        }
      }
      continue
    }

    // Detonate: first segment contact applies flat AoE damage in a blast
    // radius. Used by missile (splash on hit) and nuke (bigger blast + lingering
    // waste zone). The waste fields are optional — when absent, no DOT zone
    // is left behind. Always consumed on contact.
    if (proj.detonate) {
      let contact = false
      for (let i = 0; i < updatedEnemies.length; i++) {
        const enemy = updatedEnemies[i]
        if (enemy.hp <= 0) continue
        if (
          segmentIntersectsCircle(
            proj.prevPos ?? proj.pos,
            proj.pos,
            enemy.pos,
            enemy.radius + proj.radius
          )
        ) {
          contact = true
          break
        }
      }
      if (!contact) continue
      hitProjectiles.add(proj)
      const d = proj.detonate
      const r2 = d.aoeRadius * d.aoeRadius
      for (let i = 0; i < updatedEnemies.length; i++) {
        const e = updatedEnemies[i]
        if (e.hp <= 0) continue
        if (!canEnemyTakeDamage(e, updatedEnemies)) continue
        const { x: dx, y: dy } = toroidalDelta(proj.pos, e.pos)
        if (dx * dx + dy * dy <= r2) {
          updatedEnemies[i] = applyDamageToEnemy(e, d.blastDamage)
        }
      }
      const hasWaste =
        d.wasteRadius !== undefined && d.wasteDps !== undefined && d.wasteDuration !== undefined
      allParticles.push(
        ...spawnExplosionParticles(proj.pos, hasWaste ? 20 : 10, hasWaste ? '#88ff44' : '#ffaa55')
      )
      if (hasWaste) {
        newEffects.push(
          createNuclearWasteEffect(
            proj.pos,
            d.wasteRadius!,
            d.wasteDps!,
            d.wasteDuration!,
            d.wasteGrowDuration ?? 0.5
          )
        )
      }
      continue
    }

    // Bounce (ricochet): hit and redirect toward the nearest unhit enemy in
    // range, decrementing `remaining`. When out of bounces, consume.
    if (proj.bounce) {
      const bounce = proj.bounce
      for (let i = 0; i < updatedEnemies.length; i++) {
        const enemy = updatedEnemies[i]
        if (enemy.hp <= 0) continue
        if (bounce.hitEnemyIds.includes(enemy.id)) continue
        if (
          !segmentIntersectsCircle(
            proj.prevPos ?? proj.pos,
            proj.pos,
            enemy.pos,
            enemy.radius + proj.radius
          )
        )
          continue
        // Shielded boss: consume the bounce without redirecting or dealing damage.
        if (!canEnemyTakeDamage(enemy, updatedEnemies)) {
          hitProjectiles.add(proj)
          allParticles.push(...spawnExplosionParticles(enemy.pos, 3, '#4477aa'))
          break
        }
        updatedEnemies[i] = applyDamageToEnemy(enemy, proj.damage)
        bounce.hitEnemyIds.push(enemy.id)
        allParticles.push(...spawnExplosionParticles(enemy.pos, 6, '#ffaa44'))
        if (bounce.remaining <= 0) {
          hitProjectiles.add(proj)
          break
        }
        // Pick the closest unhit, living enemy within bounceRange.
        const rangeSq = bounce.bounceRange * bounce.bounceRange
        let next: Enemy | null = null
        let nextDistSq = rangeSq
        for (const other of updatedEnemies) {
          if (other.hp <= 0) continue
          if (bounce.hitEnemyIds.includes(other.id)) continue
          // Don't bounce toward an invincible target (shielded boss).
          if (!canEnemyTakeDamage(other, updatedEnemies)) continue
          const { x: dx, y: dy } = toroidalDelta(proj.pos, other.pos)
          const d = dx * dx + dy * dy
          if (d < nextDistSq) {
            nextDistSq = d
            next = other
          }
        }
        if (!next) {
          hitProjectiles.add(proj)
          break
        }
        const { x: dx, y: dy } = toroidalDelta(proj.pos, next.pos)
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const speed = Math.hypot(proj.vel.x, proj.vel.y) || 1
        proj.vel = { x: (dx / len) * speed, y: (dy / len) * speed }
        bounce.remaining -= 1
        // Lifetime is the practical limiter on long chains — a 3s round
        // traveling 400 px/s only reaches ~6 enemies before timing out, even
        // with bounces remaining. Extending lifetime per bounce lets the chain
        // exhaust its `remaining` instead of dying of old age mid-flight.
        if (bounce.lifetimePerBounce !== undefined) {
          proj.lifetime = Math.max(proj.lifetime, bounce.lifetimePerBounce)
        }
        break
      }
      continue
    }

    // Default bullet path — unchanged from before swappable weapons.
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
        // Shielded boss: consume the bullet but deal no damage.
        if (canEnemyTakeDamage(enemy, updatedEnemies)) {
          updatedEnemies[i] = applyDamageToEnemy(enemy, proj.damage)
          allParticles.push(...spawnExplosionParticles(enemy.pos, 6, '#ff4444'))
        } else {
          allParticles.push(...spawnExplosionParticles(enemy.pos, 3, '#4477aa'))
        }
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
    newEffects,
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
      const { x: dx, y: dy } = toroidalDelta(ally.pos, proj.pos)
      if (dx * dx + dy * dy < (proj.radius + ally.radius) ** 2) {
        updatedAllies[i] = applyDamageToAlly(ally, proj.damage)
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
  const { x: dx, y: dy } = toroidalDelta(targetPos, enemy.pos)
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
    // Void Worm head + body share one contact i-frame: a lunge that sweeps the ship
    // through several parts lands a single hit. Worm parts are re-pinned / boss-driven,
    // so they don't bounce — they just pass through.
    if (enemy.kind === EnemyKind.voidWorm || enemy.kind === EnemyKind.wormSegment) {
      if (damagedShip.wormContactCooldown <= 0) {
        damagedShip = applyDamageToShip(damagedShip, enemy.damage * (enemy.damageDealtMult ?? 1))
        damagedShip = { ...damagedShip, wormContactCooldown: WORM_CONTACT_IFRAME }
      }
      surviving.push(enemy)
      continue
    }
    damagedShip = applyDamageToShip(damagedShip, enemy.damage * (enemy.damageDealtMult ?? 1))
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
      if (checkCollision(enemy, ally)) {
        hitAllyIndex = i
        break
      }
    }
    if (hitAllyIndex === -1) {
      survivingEnemies.push(enemy)
      continue
    }
    const ally = updatedAllies[hitAllyIndex]
    updatedAllies[hitAllyIndex] = applyDamageToAlly(
      ally,
      enemy.damage * (enemy.damageDealtMult ?? 1)
    )
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

// Friendly-blue blast for a charmed unit's ram/detonation — reads as player-side.
const CHARMED_BLAST_COLOR = '#88c0ff'

// The mirror of resolveEnemyAllyMeleeCollisions for charmed units (Hypnosis): a melee
// charmed ally (attackRange 0 — drone/tank/swarm/dasher) rams the enemy it touches for
// contact damage on a cadence, and a charmed bomber detonates on contact for an AoE
// blast then is consumed. The shooter charm (attackRange > 0) keeps to its gun and is
// skipped here. Invulnerable enemies (shielded boss parts) are immune. Kills reward the
// player like any ally kill, so killed enemies + score flow back to the loop.
export function resolveCharmedAllyEnemyCollisions(
  allies: Ally[],
  enemies: Enemy[]
): {
  allies: Ally[]
  enemies: Enemy[]
  killedEnemies: Enemy[]
  particles: Particle[]
  scoreGained: number
} {
  const hasMelee = allies.some((a) => a.charmedFrom !== undefined && a.attackRange <= 0)
  if (!hasMelee) {
    return { allies, enemies, killedEnemies: [], particles: [], scoreGained: 0 }
  }

  let workingEnemies = enemies
  const updatedAllies: Ally[] = []
  const killedIds = new Set<string>()
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []
  let scoreGained = 0

  const markKilled = (e: Enemy): void => {
    if (killedIds.has(e.id)) return
    killedIds.add(e.id)
    killedEnemies.push(e)
    scoreGained += e.scoreValue
  }
  const hittable = (e: Enemy, ally: Ally): boolean =>
    !killedIds.has(e.id) && canEnemyTakeDamage(e, workingEnemies) && checkCollision(e, ally)

  for (const ally of allies) {
    if (ally.charmedFrom === undefined || ally.attackRange > 0) {
      updatedAllies.push(ally)
      continue
    }

    // Bomber: the instant it touches an enemy it detonates — AoE to everything in the
    // blast — and is consumed (one big hit, no chip cadence).
    if (ally.charmedFrom === EnemyKind.bomber) {
      if (!workingEnemies.some((e) => hittable(e, ally))) {
        updatedAllies.push(ally)
        continue
      }
      const { explosionDamage, explosionRadius } = ENEMY_STATS.bomber
      particles.push(...spawnExplosionParticles(ally.pos, 14, CHARMED_BLAST_COLOR, 1.4))
      workingEnemies = workingEnemies.map((e) => {
        if (killedIds.has(e.id) || !canEnemyTakeDamage(e, workingEnemies)) return e
        if (distance(ally.pos, e.pos) > explosionRadius) return e
        const dmg = applyDamageToEnemy(e, explosionDamage)
        if (dmg.hp <= 0) markKilled(e)
        return dmg
      })
      continue // consumed — not pushed back
    }

    // Chip rammer: on its contact cadence, hit the enemy it's touching.
    if (ally.fireCooldown > 0) {
      updatedAllies.push(ally)
      continue
    }
    const target = workingEnemies.find((e) => hittable(e, ally))
    if (!target) {
      updatedAllies.push(ally)
      continue
    }
    workingEnemies = workingEnemies.map((e) => {
      if (e.id !== target.id) return e
      const dmg = applyDamageToEnemy(e, ally.damage)
      if (dmg.hp <= 0) markKilled(e)
      return dmg
    })
    particles.push(...spawnExplosionParticles(ally.pos, 4, CHARMED_BLAST_COLOR))
    updatedAllies.push({ ...ally, fireCooldown: CHARM.meleeContactInterval })
  }

  return {
    allies: updatedAllies,
    enemies: workingEnemies.filter((e) => !killedIds.has(e.id)),
    killedEnemies,
    particles,
    scoreGained,
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
    // Boss death: big particle burst, no area damage.
    if (enemy.deathBehavior === DeathBehavior.boss) {
      particles.push(...spawnExplosionParticles(enemy.pos, 40, '#cc44ff'))
      particles.push(...spawnExplosionParticles(enemy.pos, 20, '#ffffff'))
      continue
    }

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
          updatedAllies[i] = applyDamageToAlly(ally, stats.explosionDamage)
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
