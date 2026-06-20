import { distance } from '../math/collision'
import { toroidalDelta } from '../math/toroid'
import { createAlly } from './entity-creator'
import { canEnemyTakeDamage } from '../bosses/index'
import { rng } from '../math/random'
import { HELPER_WEAPON_DEFINITIONS } from '../weapons'
import { HelperWeaponKind } from '../types'
import type { Ally, Enemy, Projectile, Ship, Vec2 } from '../types'
import { HELPER } from '../abilities/ability-data'
import {
  enemyVisibleToPlayerSide,
  hazeJitterAt,
  jitterAim,
  slowMultAt,
} from '../calamities/nebula-vision'
import type { NebulaField } from '../calamities/nebula-vision'

// Ally behavior: shoots the nearest enemy in range and orbits the ship at a
// per-ally angle. Each ally has a unique phase offset from its id hash so
// stacked allies fan out instead of overlapping. Avoidance is intentionally
// half-baked — allies should not be optimally elusive.
const ALLY_ORBIT_RADIUS = 130
const ALLY_AVOID_RADIUS = 55
const ALLY_AVOID_WEIGHT = 0.7
const ALLY_NOISE_STRENGTH = 0.4

// The four special weapons an ally can roll at spawn (bullet is the
// fallback). Each spawned ally rolls one slot uniformly; if the player has
// unlocked that weapon for allies it spawns with it, else the basic shot — so
// each unlock arms ~1/4 of allies, and unlocking all four arms them all.
const ALLY_WEAPON_POOL: readonly HelperWeaponKind[] = [
  HelperWeaponKind.laser,
  HelperWeaponKind.missile,
  HelperWeaponKind.ricochet,
  HelperWeaponKind.nuke,
]

export function rollAllyWeapon(unlockedWeapons: HelperWeaponKind[]): HelperWeaponKind {
  const slot = ALLY_WEAPON_POOL[rng.intRange(0, ALLY_WEAPON_POOL.length - 1)]
  return unlockedWeapons.includes(slot) ? slot : HelperWeaponKind.bullet
}

// Allies have no shield — damage comes straight off HP. Mirrors applyDamageToEnemy's
// shape so one call handles every source (enemy fire, melee, blasts, calamities). The
// caller still reads `.hp <= 0` to detect death and filters the ally out.
export function applyDamageToAlly(ally: Ally, damage: number): Ally {
  if (damage <= 0) return ally
  return { ...ally, hp: ally.hp - damage }
}

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
  dt: number,
  unlockedWeapons: HelperWeaponKind[],
  field?: NebulaField
): { allies: Ally[]; projectiles: Projectile[] } {
  const surviving: Ally[] = []
  const spawned: Ally[] = []
  let newProjectiles = projectiles

  for (const ally of allies) {
    const elapsed = ally.elapsed + dt
    const hp = ally.hp - HELPER.hpDecayPerSec * dt
    if (hp <= 0) continue

    let updated = {
      ...ally,
      elapsed,
      hp,
      fireCooldown: Math.max(0, ally.fireCooldown - dt),
    }

    if (ally.spawnInterval !== undefined) {
      // --- Factory: spawns helpers on a timer, never shoots ---
      const spawnTimer = (ally.spawnTimer ?? ally.spawnInterval) - dt
      if (spawnTimer <= 0) {
        spawned.push({ ...createAlly(ally.pos), weapon: rollAllyWeapon(unlockedWeapons) })
        // Carry the overshoot so cadence doesn't drift on long frames.
        updated = { ...updated, spawnTimer: ally.spawnInterval + spawnTimer }
      } else {
        updated = { ...updated, spawnTimer }
      }
    } else {
      // --- Targeting / shooting ---
      let nearestEnemy: Enemy | null = null
      let nearestDist = Infinity
      for (const enemy of enemies) {
        // Skip invincible enemies (shielded boss) — don't waste shots on them.
        if (!canEnemyTakeDamage(enemy, enemies)) continue
        // Fog: skip enemies the player's side can't see (concealed in the murk).
        if (field && !enemyVisibleToPlayerSide(enemy.pos, field)) continue
        const d = distance(ally.pos, enemy.pos)
        if (d < nearestDist) {
          nearestDist = d
          nearestEnemy = enemy
        }
      }
      if (nearestEnemy && nearestDist <= ally.attackRange && updated.fireCooldown <= 0) {
        // Fire the ally's rolled weapon — the basic shot is the bullet weapon, so
        // unarmed allies behave exactly as before; armed ones borrow the helper
        // weapon's projectiles + damage scaling (a nuke ally fires slow + rare).
        const def = HELPER_WEAPON_DEFINITIONS[ally.weapon]
        const damage = def.weaponDamage(ally.damage)
        // Haze: scatter the ally's aim if it sits in a haze zone (symmetric with enemies).
        const jitter = field ? hazeJitterAt(ally.pos, field.haze) : 0
        const aim = jitter > 0 ? jitterAim(ally.pos, nearestEnemy.pos, jitter) : nearestEnemy.pos
        const shots = def.createProjectiles(ally.pos, aim, damage)
        newProjectiles = [...newProjectiles, ...shots]
        updated = { ...updated, fireCooldown: 1 / (ally.fireRate * def.fireRateMultiplier) }
      }
    }

    // --- Steering: orbit a per-ally point near the ship, weak avoid + noise ---
    const target = allyOrbitTarget(updated, ship)
    const toTarget = toroidalDelta(ally.pos, target)
    let steerX = toTarget.x
    let steerY = toTarget.y
    const toTargetMag = Math.sqrt(steerX * steerX + steerY * steerY)
    if (toTargetMag > 0.01) {
      steerX /= toTargetMag
      steerY /= toTargetMag
    }
    for (const enemy of enemies) {
      const { x: ex, y: ey } = toroidalDelta(enemy.pos, ally.pos)
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
    // Slow nebula drags the ally's translation (its turn responsiveness is unchanged).
    const allySpeed = field ? ally.speed * slowMultAt(ally.pos, field.slow) : ally.speed
    let targetVx = 0
    let targetVy = 0
    if (steerMag > 0.001) {
      targetVx = (steerX / steerMag) * allySpeed
      targetVy = (steerY / steerMag) * allySpeed
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

  return { allies: [...surviving, ...spawned], projectiles: newProjectiles }
}
