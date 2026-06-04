import { distance } from './collision'
import { createProjectile } from './entities'
import { rng } from './random'
import { ProjectileOwner } from './types'
import type { Ally, Enemy, Projectile, Ship, Vec2 } from './types'

// Ally behavior: shoots the nearest enemy in range and orbits the ship at a
// per-ally angle. Each ally has a unique phase offset from its id hash so
// stacked allies fan out instead of overlapping. Avoidance is intentionally
// half-baked — allies should not be optimally elusive.
const ALLY_ORBIT_RADIUS = 130
const ALLY_AVOID_RADIUS = 55
const ALLY_AVOID_WEIGHT = 0.7
const ALLY_NOISE_STRENGTH = 0.4

function allyOrbitTarget(ally: Ally, ship: Ship): Vec2 {
  // Per-ally phase from id hash; slowly drifts so each ally weaves around the
  // ship instead of locking to a fixed offset.
  const idNum = parseInt(ally.id.slice(1), 10) || 0
  const baseAngle = idNum * 2.3998 // golden-angle-ish, gives good fan-out
  const driftAngle = baseAngle + ally.elapsed * 0.6
  return {
    x: ship.pos.x + Math.cos(driftAngle) * ALLY_ORBIT_RADIUS,
    y: ship.pos.y + Math.sin(driftAngle) * ALLY_ORBIT_RADIUS,
  }
}

export function updateAllies(
  allies: Ally[],
  enemies: Enemy[],
  ship: Ship,
  projectiles: Projectile[],
  dt: number
): { allies: Ally[]; projectiles: Projectile[] } {
  const surviving: Ally[] = []
  let newProjectiles = projectiles

  for (const ally of allies) {
    const elapsed = ally.elapsed + dt
    if (elapsed >= ally.duration) continue

    let updated = { ...ally, elapsed, fireCooldown: Math.max(0, ally.fireCooldown - dt) }

    // --- Targeting / shooting ---
    let nearestEnemy: Enemy | null = null
    let nearestDist = Infinity
    for (const enemy of enemies) {
      const d = distance(ally.pos, enemy.pos)
      if (d < nearestDist) {
        nearestDist = d
        nearestEnemy = enemy
      }
    }
    if (nearestEnemy && nearestDist <= ally.attackRange && updated.fireCooldown <= 0) {
      const proj = createProjectile(ally.pos, nearestEnemy.pos, ProjectileOwner.ship, ally.damage)
      newProjectiles = [...newProjectiles, proj]
      updated = { ...updated, fireCooldown: 1 / ally.fireRate }
    }

    // --- Steering: orbit a per-ally point near the ship, weak avoid + noise ---
    const target = allyOrbitTarget(updated, ship)
    let steerX = target.x - ally.pos.x
    let steerY = target.y - ally.pos.y
    const toTargetMag = Math.sqrt(steerX * steerX + steerY * steerY)
    if (toTargetMag > 0.01) {
      steerX /= toTargetMag
      steerY /= toTargetMag
    }
    for (const enemy of enemies) {
      const ex = ally.pos.x - enemy.pos.x
      const ey = ally.pos.y - enemy.pos.y
      const d = Math.sqrt(ex * ex + ey * ey)
      if (d < ALLY_AVOID_RADIUS && d > 0.01) {
        const weight = (1 - d / ALLY_AVOID_RADIUS) * ALLY_AVOID_WEIGHT
        steerX += (ex / d) * weight
        steerY += (ey / d) * weight
      }
    }
    // Per-ally noise so they don't all dodge in the exact same direction
    steerX += (rng.next() - 0.5) * ALLY_NOISE_STRENGTH
    steerY += (rng.next() - 0.5) * ALLY_NOISE_STRENGTH

    const steerMag = Math.sqrt(steerX * steerX + steerY * steerY)
    let targetVx = 0
    let targetVy = 0
    if (steerMag > 0.001) {
      targetVx = (steerX / steerMag) * ally.speed
      targetVy = (steerY / steerMag) * ally.speed
    }
    const turnRate = ally.speed / 30
    const alpha = 1 - Math.exp(-turnRate * dt)
    const vx = ally.vel.x + (targetVx - ally.vel.x) * alpha
    const vy = ally.vel.y + (targetVy - ally.vel.y) * alpha
    updated = {
      ...updated,
      pos: { x: ally.pos.x + vx * dt, y: ally.pos.y + vy * dt },
      vel: { x: vx, y: vy },
    }

    surviving.push(updated)
  }

  return { allies: surviving, projectiles: newProjectiles }
}
