import { ANIMATION, ENEMY_STATS, HAZARD } from '../../data'
import { distance } from '../math/collision'
import { toroidalDelta } from '../math/toroid'
import { createProjectile } from './entity-creator'
import { tickDasher } from './dasher'
import { MovementBehavior, ProjectileOwner } from '../types'
import type { Ally, Enemy, Hazard, Projectile, Ship, Vec2 } from '../types'

// Returns the position of the nearest entity to a given point (ship or any ally).
export function findNearestTarget(pos: Vec2, ship: Ship, allies: Ally[]): Vec2 {
  let nearest = ship.pos
  let nearestDist = distance(pos, ship.pos)
  for (const ally of allies) {
    const d = distance(pos, ally.pos)
    if (d < nearestDist) {
      nearest = ally.pos
      nearestDist = d
    }
  }
  return nearest
}

// Direction the enemy sprite should point: its velocity when moving, otherwise
// toward the nearest target — so a parked shooter faces what it fires at rather
// than a fixed heading.
export function enemyFacing(enemy: Enemy, ship: Ship, allies: Ally[]): Vec2 {
  if (enemy.vel.x !== 0 || enemy.vel.y !== 0) return enemy.vel
  return toroidalDelta(enemy.pos, findNearestTarget(enemy.pos, ship, allies))
}

type MoveFn = (enemy: Enemy, ship: Ship, dt: number) => Enemy

// How fast a knockback impulse (e.g. a Force Field bump) bleeds off once the
// enemy's own AI would otherwise sit still. Chasers already decay it through
// their velocity blend; this lets keepRange/stationary enemies coast out too
// instead of cancelling the bump on the spot.
const KNOCKBACK_DECAY = 3

// Park threshold: once a coasting bump slows below 1 px/s, zero it. Squared to
// skip a sqrt.
const KNOCKBACK_PARK_SPEED_SQ = 1

// Hold station while any residual velocity (a bump) coasts out and decays — so a
// knockback flings the enemy instead of being zeroed the instant it wants to
// stop. Below a crawl it just parks.
function holdWithKnockback(enemy: Enemy, dt: number): Enemy {
  const decay = Math.exp(-KNOCKBACK_DECAY * dt)
  const vx = enemy.vel.x * decay
  const vy = enemy.vel.y * decay
  if (vx * vx + vy * vy < KNOCKBACK_PARK_SPEED_SQ) return { ...enemy, vel: { x: 0, y: 0 } }
  return {
    ...enemy,
    pos: { x: enemy.pos.x + vx * dt, y: enemy.pos.y + vy * dt },
    vel: { x: vx, y: vy },
  }
}

function moveChase(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const { x: dx, y: dy } = toroidalDelta(enemy.pos, ship.pos)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  const targetVx = (dx / dist) * enemy.speed
  const targetVy = (dy / dist) * enemy.speed

  // Smooth velocity toward the target so slow chasers (tanks) don't jitter when
  // the ship reverses on its patrol. Heavier enemies turn more slowly: rate
  // scales with their movement speed.
  const turnRate = enemy.speed / 30
  const alpha = 1 - Math.exp(-turnRate * dt)
  const vx = enemy.vel.x + (targetVx - enemy.vel.x) * alpha
  const vy = enemy.vel.y + (targetVy - enemy.vel.y) * alpha

  return {
    ...enemy,
    pos: { x: enemy.pos.x + vx * dt, y: enemy.pos.y + vy * dt },
    vel: { x: vx, y: vy },
  }
}

function moveKeepRange(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const { x: dx, y: dy } = toroidalDelta(enemy.pos, ship.pos)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  if (dist < enemy.attackRange * 0.7) {
    return holdWithKnockback(enemy, dt)
  }

  const nx = dx / dist
  const ny = dy / dist
  return {
    ...enemy,
    pos: {
      x: enemy.pos.x + nx * enemy.speed * dt,
      y: enemy.pos.y + ny * enemy.speed * dt,
    },
    vel: { x: nx * enemy.speed, y: ny * enemy.speed },
  }
}

function moveZigzag(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const { x: dx, y: dy } = toroidalDelta(enemy.pos, ship.pos)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  const nx = dx / dist
  const ny = dy / dist

  // Hash the numeric suffix of the ID for a per-enemy phase offset so pack
  // members don't weave in lockstep. The oscillation is driven by the enemy's
  // own age (game time, speed-scaled) rather than wall-clock, keeping it
  // deterministic and in sync with the game-speed setting.
  const idNum = parseInt(enemy.id.slice(1), 10) || 0
  const phase = idNum * 2.39996
  const lateralStrength = Math.sin(enemy.age * 5 + phase) * 0.6

  const mx = nx + -ny * lateralStrength
  const my = ny + nx * lateralStrength
  const mDist = Math.sqrt(mx * mx + my * my)
  const fmx = mDist > 0 ? mx / mDist : 0
  const fmy = mDist > 0 ? my / mDist : 0

  return {
    ...enemy,
    pos: {
      x: enemy.pos.x + fmx * enemy.speed * dt,
      y: enemy.pos.y + fmy * enemy.speed * dt,
    },
    vel: { x: fmx * enemy.speed, y: fmy * enemy.speed },
  }
}

function moveStationary(enemy: Enemy, _ship: Ship, dt: number): Enemy {
  return holdWithKnockback(enemy, dt)
}

// Boss-tick-driven enemies (worm head/segments): position and velocity are
// owned by updateBossAI, so movement leaves them untouched.
const moveNone: MoveFn = (enemy) => enemy

// Pursues the target like chase, but stops once within `attackRange` so the
// enemy parks at a fixed standoff instead of ramming. Used by the boss so the
// player can engage it without chasing it across the map.
function moveApproach(enemy: Enemy, ship: Ship, dt: number): Enemy {
  if (distance(enemy.pos, ship.pos) <= enemy.attackRange) {
    return { ...enemy, vel: { x: 0, y: 0 } }
  }
  return moveChase(enemy, ship, dt)
}

const MOVEMENT_FN: Record<MovementBehavior, MoveFn> = {
  [MovementBehavior.chase]: moveChase,
  [MovementBehavior.keepRange]: moveKeepRange,
  [MovementBehavior.zigzag]: moveZigzag,
  [MovementBehavior.stationary]: moveStationary,
  [MovementBehavior.approach]: moveApproach,
  [MovementBehavior.dash]: tickDasher,
  [MovementBehavior.none]: moveNone,
}

// Enemies steer around mines by blending a dominant tangential bend (arcs past a
// mine ahead, avoiding the ugly orbit a pure radial push settles into) with a
// gentler always-on radial push-out that ramps up close. Parked enemies (no
// heading) skip it — they only eat a mine when the player forces them in.
function avoidHazards(enemy: Enemy, hazards: Hazard[], dt: number): Enemy {
  if (hazards.length === 0) return enemy
  const speed = Math.hypot(enemy.vel.x, enemy.vel.y)
  if (speed < 0.01) return enemy

  const headingX = enemy.vel.x / speed
  const headingY = enemy.vel.y / speed
  let steerX = 0
  let steerY = 0
  for (const h of hazards) {
    const { x: dx, y: dy } = toroidalDelta(enemy.pos, h.pos) // enemy → mine
    const d = Math.hypot(dx, dy)
    const reach = h.radius + HAZARD.avoidRadius
    if (d >= reach || d < 0.01) continue
    const toMineX = dx / d
    const toMineY = dy / d
    const closeness = 1 - d / reach // 0 at the edge → 1 at the centre
    // Radial push straight out, always on — keeps distance even when the mine is
    // beside or behind (a circling enemy), ramping up sharply as it nears.
    steerX += -toMineX * closeness * closeness
    steerY += -toMineY * closeness * closeness
    // Tangential bend to arc around a mine that's ahead, for a smooth path past it.
    const ahead = headingX * toMineX + headingY * toMineY
    if (ahead > 0) {
      const perpX = -toMineY
      const perpY = toMineX
      const side = headingX * perpX + headingY * perpY >= 0 ? 1 : -1
      const urgency = closeness * ahead // closer + more head-on = sharper turn
      steerX += side * perpX * urgency * HAZARD.avoidTangent
      steerY += side * perpY * urgency * HAZARD.avoidTangent
    }
  }
  if (steerX === 0 && steerY === 0) return enemy

  // Bend the heading toward the tangent, keep the speed, and ease the velocity over
  // so the path curves instead of snapping. Correct position by the velocity delta
  // the MoveFn already integrated this frame.
  const desiredX = headingX + steerX * HAZARD.avoidStrength
  const desiredY = headingY + steerY * HAZARD.avoidStrength
  const desiredMag = Math.hypot(desiredX, desiredY) || 1
  const turn = 1 - Math.exp(-HAZARD.avoidTurnRate * dt)
  const vx = enemy.vel.x + ((desiredX / desiredMag) * speed - enemy.vel.x) * turn
  const vy = enemy.vel.y + ((desiredY / desiredMag) * speed - enemy.vel.y) * turn
  return {
    ...enemy,
    pos: { x: enemy.pos.x + (vx - enemy.vel.x) * dt, y: enemy.pos.y + (vy - enemy.vel.y) * dt },
    vel: { x: vx, y: vy },
  }
}

export function updateEnemyMovement(
  enemies: Enemy[],
  ship: Ship,
  allies: Ally[],
  hazards: Hazard[],
  dt: number,
  speedMult = 1
): Enemy[] {
  return enemies.map((enemy) => {
    const target = findNearestTarget(enemy.pos, ship, allies)
    const targetAsShip = { ...ship, pos: target }
    // Stall-escalation scales movement speed without mutating the stored base:
    // run the MoveFn on a sped-up copy, then restore enemy.speed on the result.
    const forMove = speedMult === 1 ? enemy : { ...enemy, speed: enemy.speed * speedMult }
    const moved = avoidHazards(
      MOVEMENT_FN[enemy.movementBehavior](forMove, targetAsShip, dt),
      hazards,
      dt
    )
    return {
      ...moved,
      speed: enemy.speed,
      age: enemy.age + dt,
      spawnIn: Math.max(0, enemy.spawnIn - dt),
      hitFlash: Math.max(0, enemy.hitFlash - dt),
      hitFlashCooldown: Math.max(0, enemy.hitFlashCooldown - dt),
    }
  })
}

export function updateEnemyShooting(
  enemies: Enemy[],
  ship: Ship,
  allies: Ally[],
  projectiles: Projectile[],
  dt: number
): { enemies: Enemy[]; projectiles: Projectile[] } {
  const updatedEnemies: Enemy[] = []
  let newProjectiles = projectiles

  for (const enemy of enemies) {
    const fireFlash = Math.max(0, enemy.fireFlash - dt)
    if (enemy.fireRate <= 0) {
      updatedEnemies.push({ ...enemy, fireFlash })
      continue
    }

    let cooldown = enemy.fireCooldown - dt
    let nextFireFlash = fireFlash
    if (cooldown <= 0) {
      const target = findNearestTarget(enemy.pos, ship, allies)
      const dist = distance(enemy.pos, target)
      const stats = ENEMY_STATS[enemy.kind]
      // Boss + generators fire from a longer `fireRange` than their movement
      // standoff; everything else uses its attackRange.
      const fireRange = 'fireRange' in stats ? stats.fireRange : enemy.attackRange
      if (dist < fireRange) {
        const projDamage =
          'projectileDamage' in stats
            ? stats.projectileDamage
            : ENEMY_STATS.shooter.projectileDamage
        const speed = 'projectileSpeed' in stats ? stats.projectileSpeed : undefined
        const beam = 'projectileBeam' in stats ? stats.projectileBeam : undefined
        const proj = createProjectile(enemy.pos, target, ProjectileOwner.enemy, projDamage, {
          speed,
          beam,
        })
        newProjectiles = [...newProjectiles, proj]
        cooldown = 1 / enemy.fireRate
        nextFireFlash = ANIMATION.enemyFireFlash
      }
    }
    updatedEnemies.push({ ...enemy, fireCooldown: Math.max(0, cooldown), fireFlash: nextFireFlash })
  }

  return { enemies: updatedEnemies, projectiles: newProjectiles }
}
