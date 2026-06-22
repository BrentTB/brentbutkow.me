import { distance } from '../math/collision'
import { toroidalDelta, wrapPosition } from '../math/toroid'
import { createAlly, spawnExplosionParticles } from './entity-creator'
import { canEnemyTakeDamage } from '../bosses'
import { rng } from '../math/random'
import { HELPER_WEAPON_DEFINITIONS } from '../weapons'
import { HelperWeaponKind } from '../types'
import type { Ally, Enemy, Particle, Projectile, Ship, Vec2 } from '../types'
import { CHARM, HELPER } from '../abilities/ability-data'
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

// A charmed unit holds station: it leans toward the nearest enemy (so it faces and
// pokes at what it shoots) while its anchor leash stops it chasing across the map.
// With nothing in sight it eases back toward its anchor.
function charmSteerTarget(ally: Ally, nearestEnemy: Enemy | null): Vec2 {
  return nearestEnemy ? nearestEnemy.pos : (ally.anchor ?? ally.pos)
}

export function updateAllies(
  allies: Ally[],
  enemies: Enemy[],
  ship: Ship,
  projectiles: Projectile[],
  dt: number,
  unlockedWeapons: HelperWeaponKind[],
  field?: NebulaField
): { allies: Ally[]; projectiles: Projectile[]; particles: Particle[] } {
  const surviving: Ally[] = []
  const spawned: Ally[] = []
  const particles: Particle[] = []
  let newProjectiles = projectiles

  for (const ally of allies) {
    const elapsed = ally.elapsed + dt
    const charmed = ally.charmedFrom !== undefined

    // Lifecycle: a charmed unit runs on a fixed timer (no HP decay) and poofs when
    // its mind-control lapses; a helper bleeds HP over time. Either still dies early
    // to enemy fire (hp <= 0).
    let hp = ally.hp
    let expiresIn = ally.expiresIn
    if (charmed) {
      expiresIn = (ally.expiresIn ?? 0) - dt
    } else {
      hp = ally.hp - HELPER.hpDecayPerSec * dt
    }
    // A charmed unit poofs whenever it leaves the field — timer lapsed or shot down;
    // a helper just vanishes on HP death (unchanged).
    if ((charmed && (expiresIn ?? 0) <= 0) || hp <= 0) {
      if (charmed) {
        particles.push(...spawnExplosionParticles(ally.pos, CHARM.poofCount, CHARM.poofColor, 0.6))
      }
      continue
    }

    let updated = {
      ...ally,
      elapsed,
      hp,
      ...(charmed ? { expiresIn } : {}),
      fireCooldown: Math.max(0, ally.fireCooldown - dt),
    }

    // Nearest targetable enemy — drives both shooting and a charmed unit's facing.
    let nearestEnemy: Enemy | null = null

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
      let nearestDist = Infinity
      for (const enemy of enemies) {
        // Skip invincible enemies (shielded boss) — don't waste shots on them.
        if (!canEnemyTakeDamage(enemy, enemies)) continue
        // Fog: skip enemies the player's side can't see (concealed in the murk).
        // Bosses ignore fog — always visible + targetable, like the renderer/enemy AI.
        if (field && !enemy.boss && !enemyVisibleToPlayerSide(enemy.pos, field)) continue
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

    // --- Steering: helpers orbit the ship; charmed units hold station (lean toward
    // the nearest enemy, but leashed to their anchor). Weak avoid + noise on both. ---
    const target = charmed
      ? charmSteerTarget(updated, nearestEnemy)
      : allyOrbitTarget(updated, ship)
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
    let pos = { x: ally.pos.x + vx * dt, y: ally.pos.y + vy * dt }
    // Hold-position leash: a charmed unit can't drift past CHARM.leash from its
    // anchor, so it fights where it was planted instead of chasing across the map.
    if (charmed && ally.anchor) {
      const off = toroidalDelta(ally.anchor, pos)
      const d = Math.hypot(off.x, off.y)
      if (d > CHARM.leash) {
        pos = wrapPosition({
          x: ally.anchor.x + (off.x / d) * CHARM.leash,
          y: ally.anchor.y + (off.y / d) * CHARM.leash,
        })
      }
    }
    updated = { ...updated, pos, vel: { x: vx, y: vy } }

    surviving.push(updated)
  }

  return { allies: [...surviving, ...spawned], projectiles: newProjectiles, particles }
}
