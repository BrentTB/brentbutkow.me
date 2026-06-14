import { ANIMATION, SECTOR, SHIELD_COOLDOWN, SLINGSHOT } from '../../data'
import { canEnemyTakeDamage } from '../bosses/index'
import { distance } from '../math/collision'
import { driftWithWeave, softTether1D } from '../math/steering'
import { clamp, clampToWorld } from '../math/utils'
import { rng } from '../math/random'
import { createParticle } from './entity-creator'
import { ESCAPE_MODE } from '../spaceMetalAbilities/escape-mode'
import { SHIP_WEAPON_DEFINITIONS } from '../ship'
import { EscapeModePhase } from '../types'
import type { Enemy, Particle, PlayerUpgrades, Projectile, Ship, Vec2 } from '../types'

// --- Slingshot ---
// Per-second exponential decay of the coast velocity — how long the ship drifts
// after release before auto-movement resumes. Not upgradable (it's feel, not power).
const SLING_DECAY = 1.7
// Below this coast speed the fling is spent and normal auto-movement takes over.
const SLING_MIN_SPEED = 60
// Particles spat out where a coasting fling bounces off a corridor wall.
const SLING_BOUNCE_PARTICLES = 8

// Converts a release flick (unit dir + 0..1 charge) into a coast velocity using
// the ship's upgraded power, accuracy, and cooldown. Scatter widens with heat
// (control slips as you heat up). Adds heat scaled by charge, and overheats at
// max. No-op while on cooldown or overheated.
export function applySlingshot(ship: Ship, fling: { dir: Vec2; charge: number }): Ship {
  if (ship.slingCooldownRemaining > 0 || ship.slingOverheated) return ship
  const charge = clamp(fling.charge, 0, 1)
  // Current heat widens the scatter — a warning that you're pushing your luck.
  const jitterMag = ship.slingJitter + ship.slingHeat * SLINGSHOT.heatJitterBonus
  const jitter = rng.range(-jitterMag, jitterMag)
  const cos = Math.cos(jitter)
  const sin = Math.sin(jitter)
  const dx = fling.dir.x * cos - fling.dir.y * sin
  const dy = fling.dir.x * sin + fling.dir.y * cos
  const speed = ship.slingMaxSpeed * charge
  const heat = Math.min(1, ship.slingHeat + SLINGSHOT.heatPerFling * charge)
  return {
    ...ship,
    flingVel: { x: dx * speed, y: dy * speed },
    slingCooldownRemaining: ship.slingCooldown,
    slingHeat: heat,
    slingOverheated: heat >= 1,
  }
}

// Cools slingshot heat each tick and clears the overheat lockout once heat falls
// back below the re-engage threshold (hysteresis — you can't tap in/out at the
// cap). Cooling rate is the ship's upgraded slingCoolRate.
export function tickSlingHeat(ship: Ship, dt: number): Ship {
  if (ship.slingHeat <= 0 && !ship.slingOverheated) return ship
  const heat = Math.max(0, ship.slingHeat - ship.slingCoolRate * dt)
  const overheated = ship.slingOverheated && heat > SLINGSHOT.heatReengage
  return { ...ship, slingHeat: heat, slingOverheated: overheated }
}

// Advances the slingshot coast: moves the ship by its fling velocity and decays
// it. A coast that reaches a corridor wall BOUNCES — the perpendicular velocity is
// reflected (with an impact spark) rather than pinned to the edge, which would
// otherwise stall the ship against the wall until the velocity decayed. Returns
// `active: true` while the coast is meaningful; once it fades the velocity is
// zeroed and normal auto-movement resumes.
export function tickFling(
  ship: Ship,
  dt: number,
  worldSize: Vec2
): { ship: Ship; active: boolean; particles: Particle[] } {
  const speed = Math.hypot(ship.flingVel.x, ship.flingVel.y)
  if (speed < SLING_MIN_SPEED) {
    if (ship.flingVel.x === 0 && ship.flingVel.y === 0)
      return { ship, active: false, particles: [] }
    return { ship: { ...ship, flingVel: { x: 0, y: 0 } }, active: false, particles: [] }
  }

  const r = ship.radius
  let x = ship.pos.x + ship.flingVel.x * dt
  let y = ship.pos.y + ship.flingVel.y * dt
  let vx = ship.flingVel.x
  let vy = ship.flingVel.y
  let hit: Vec2 | null = null

  if (x < r) {
    x = r
    vx = Math.abs(vx)
    hit = { x: 0, y }
  } else if (x > worldSize.x - r) {
    x = worldSize.x - r
    vx = -Math.abs(vx)
    hit = { x: worldSize.x, y }
  }
  if (y < r) {
    y = r
    vy = Math.abs(vy)
    hit = { x, y: 0 }
  } else if (y > worldSize.y - r) {
    y = worldSize.y - r
    vy = -Math.abs(vy)
    hit = { x, y: worldSize.y }
  }

  const particles: Particle[] = []
  if (hit) {
    for (let i = 0; i < SLING_BOUNCE_PARTICLES; i++) {
      particles.push(
        createParticle(
          hit,
          { x: rng.range(-70, 70), y: rng.range(-70, 70) },
          '#9bc8ff',
          0.5,
          rng.range(2, 4)
        )
      )
    }
  }

  const decay = Math.exp(-SLING_DECAY * dt)
  return {
    ship: {
      ...ship,
      pos: { x, y },
      vel: { x: vx, y: vy },
      flingVel: { x: vx * decay, y: vy * decay },
      lastHeading: { x: vx / speed, y: vy / speed },
    },
    active: true,
    particles,
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
    // Flash white only on HP damage — a shield absorb already reads via its ring.
    hitFlash: hpDamage > 0 ? ANIMATION.hitFlash : ship.hitFlash,
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
      worldSize,
      ship.radius
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
    worldSize,
    ship.radius
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

// Drives the ship's auto-movement each tick. With an enemy around it HUNTS —
// closes to attack range then strafes while the guns work. With the lane clear it
// drifts gently forward (up the corridor). Softly tethered inside the walls; no
// fixed centre to snap back to, so a spent slingshot resumes from where it landed.
export function updateShipDrift(
  ship: Ship,
  dt: number,
  ctx: {
    worldSize: Vec2
    forwardDir: Vec2
    target: Vec2 | null
    corridorCenterX: number
    corridorHalfWidth: number
  }
): Ship {
  const { worldSize, forwardDir, target, corridorCenterX, corridorHalfWidth } = ctx

  const weavePhase = ship.weavePhase + dt * SECTOR.weaveFrequency
  // Overheating the slingshot saps engine power — the ship limps until it cools.
  const overheatMult = ship.slingOverheated ? SLINGSHOT.overheatSlowMult : 1
  const driftMomentum = Math.max(0, ship.driftMomentum - dt)

  let velX: number
  let velY: number

  if (target) {
    // Hunt by orbiting: a radial term holds the ship near `orbitRange` (closing in
    // when far, easing off when too close) and a tangential term circles the enemy,
    // so it engages from a ring instead of beelining or ramming. Steering toward
    // the desired velocity (rather than snapping to it) keeps the path flowy.
    const dx = target.x - ship.pos.x
    const dy = target.y - ship.pos.y
    const dist = Math.hypot(dx, dy) || 1
    const dirX = dx / dist
    const dirY = dy / dist
    const speed = ship.speed * overheatMult
    const orbitRange = ship.attackRange * SECTOR.orbitRangeFraction
    const radial = clamp(dist - orbitRange, -speed, speed)
    const tangent = speed * SECTOR.orbitSpeedFraction
    // Orbit toward the side the target sits on (its lateral offset) rather than
    // always circling the same way — otherwise every head-on engagement strafes
    // the same direction. A perfectly vertical target breaks the tie on fore/aft.
    const hand = dirX > 0 || (dirX === 0 && dirY >= 0) ? 1 : -1
    let desiredX = dirX * radial - hand * dirY * tangent
    let desiredY = dirY * radial + hand * dirX * tangent
    const dmag = Math.hypot(desiredX, desiredY)
    if (dmag > speed) {
      desiredX = (desiredX / dmag) * speed
      desiredY = (desiredY / dmag) * speed
    }
    const steer = 1 - Math.exp(-SECTOR.steerRate * dt)
    velX = ship.vel.x + (desiredX - ship.vel.x) * steer
    velY = ship.vel.y + (desiredY - ship.vel.y) * steer
  } else {
    // Lane clear — gentle forward drift with a weave. Momentum keeps a spent
    // fling coasting its way instead of snapping back toward forward.
    let fwd = forwardDir
    if (ship.driftMomentum > 0) {
      const t = 1 - ship.driftMomentum / SECTOR.momentumWindow
      const bx = ship.lastHeading.x + (forwardDir.x - ship.lastHeading.x) * t
      const by = ship.lastHeading.y + (forwardDir.y - ship.lastHeading.y) * t
      const mag = Math.hypot(bx, by)
      if (mag > 0.0001) fwd = { x: bx / mag, y: by / mag }
    }
    const drift = driftWithWeave(
      ship.pos,
      fwd,
      SECTOR.driftSpeed * overheatMult,
      { amplitude: SECTOR.weaveAmplitude, phase: weavePhase },
      dt
    )
    velX = drift.vel.x
    velY = drift.vel.y
  }

  // Soft lateral tether — a hard sideways fling curves back instead of hitting a
  // wall. Capped so a spent fling pinned at the wall eases back, not springs.
  velX += softTether1D(
    ship.pos.x,
    corridorCenterX - corridorHalfWidth,
    corridorCenterX + corridorHalfWidth,
    SECTOR.lateralTetherStrength,
    SECTOR.lateralTetherMax
  )

  const pos = clampToWorld(
    { x: ship.pos.x + velX * dt, y: ship.pos.y + velY * dt },
    worldSize,
    ship.radius
  )

  const speedMag = Math.hypot(velX, velY)
  const lastHeading =
    speedMag > 0.01 ? { x: velX / speedMag, y: velY / speedMag } : ship.lastHeading

  return {
    ...ship,
    pos,
    vel: { x: velX, y: velY },
    weavePhase,
    driftMomentum,
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
  // Cosmetic firing timers decay every frame whether or not a shot lands.
  // Built from weaponSlots so a slot-count upgrade can't leave a stale length.
  const muzzleFlash = Array.from({ length: ship.weaponSlots }, (_, i) =>
    Math.max(0, (ship.muzzleFlash[i] ?? 0) - dt)
  )
  let recoil = Math.max(0, ship.recoil - dt)

  const idle = (): { ship: Ship; projectiles: Projectile[] } => ({
    ship: { ...ship, fireCooldowns, muzzleFlash, recoil },
    projectiles,
  })

  if (enemies.length === 0) return idle()

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
  if (inRange.length === 0) return idle()

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
    muzzleFlash[i] = ANIMATION.muzzleFlash
    recoil = ANIMATION.recoil
  }

  return { ship: { ...ship, fireCooldowns, muzzleFlash, recoil }, projectiles: nextProjectiles }
}
