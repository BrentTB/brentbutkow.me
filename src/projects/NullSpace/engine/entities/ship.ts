import { ANIMATION, SECTOR, SHIELD_COOLDOWN, SLINGSHOT } from '../../data'
import { driftWithWeave } from '../math/steering'
import { clamp } from '../math/utils'
import { toroidalDelta } from '../math/toroid'
import { rng } from '../math/random'
import { createParticle } from './entity-creator'
import { ESCAPE_MODE } from '../spaceMetalAbilities/escape-mode'
import { EscapeModePhase } from '../types'
import type { Particle, Ship, Vec2 } from '../types'

// --- Slingshot ---
// Per-second exponential decay of the coast velocity — how long the ship drifts
// after release before auto-movement resumes. Not upgradable (it's feel, not power).
const SLING_DECAY = 1.7
// Below this coast speed the fling is spent and normal auto-movement takes over.
const SLING_MIN_SPEED = 60

// Converts a release flick (unit dir + 0..1 charge) into a coast velocity using
// the ship's upgraded power, accuracy, and cooldown. Scatter widens with heat
// (control slips as you heat up). Adds heat scaled by charge, and overheats at
// max. No-op while on cooldown; while overheated it still flings, but at half
// distance for double heat.
export function applySlingshot(
  ship: Ship,
  fling: { dir: Vec2; charge: number },
  slowMult = 1
): Ship {
  if (ship.slingCooldownRemaining > 0) return ship
  const charge = clamp(fling.charge, 0, 1)
  // Overheated flings still work — half the distance for double the heat. A
  // heavy penalty, not a lockout, so you can always limp out of danger.
  const speedMult = ship.slingOverheated ? 0.5 : 1
  const heatMult = ship.slingOverheated ? 2 : 1
  // Current heat widens the scatter — a warning that you're pushing your luck.
  const jitterMag = ship.slingJitter + ship.slingHeat * SLINGSHOT.heatJitterBonus
  const jitter = rng.range(-jitterMag, jitterMag)
  const cos = Math.cos(jitter)
  const sin = Math.sin(jitter)
  const dx = fling.dir.x * cos - fling.dir.y * sin
  const dy = fling.dir.x * sin + fling.dir.y * cos
  // A slow nebula hinders the launch — a fling from inside it goes less far.
  const speed = ship.slingMaxSpeed * charge * speedMult * slowMult
  const heat = Math.min(1, ship.slingHeat + SLINGSHOT.heatPerFling * charge * heatMult)
  return {
    ...ship,
    flingVel: { x: dx * speed, y: dy * speed },
    slingCooldownRemaining: ship.slingCooldown,
    slingHeat: heat,
    // Stay overheated until heat cools below the re-engage threshold (cleared in
    // tickSlingHeat) — a penalty fling never lifts the lockout on its own.
    slingOverheated: ship.slingOverheated || heat >= 1,
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
// it. Returns `active: true` while the coast is meaningful; once it fades the
// velocity is zeroed and normal auto-movement resumes.
export function tickFling(ship: Ship, dt: number, slowMult = 1): { ship: Ship; active: boolean } {
  const speed = Math.hypot(ship.flingVel.x, ship.flingVel.y)
  if (speed < SLING_MIN_SPEED) {
    if (ship.flingVel.x === 0 && ship.flingVel.y === 0) return { ship, active: false }
    return { ship: { ...ship, flingVel: { x: 0, y: 0 } }, active: false }
  }

  // No walls on the torus — the coast just carries the ship and the world-wrap
  // pass brings it back around. Velocity decays so auto-movement resumes. A slow
  // nebula drags this frame's travel without sapping the stored momentum, so the
  // coast resumes full speed once the ship clears the zone.
  const decay = Math.exp(-SLING_DECAY * dt)
  return {
    ship: {
      ...ship,
      pos: {
        x: ship.pos.x + ship.flingVel.x * dt * slowMult,
        y: ship.pos.y + ship.flingVel.y * dt * slowMult,
      },
      vel: { x: ship.flingVel.x * slowMult, y: ship.flingVel.y * slowMult },
      flingVel: { x: ship.flingVel.x * decay, y: ship.flingVel.y * decay },
      lastHeading: { x: ship.flingVel.x / speed, y: ship.flingVel.y / speed },
    },
    active: true,
  }
}

export function applyDamageToShip(ship: Ship, damage: number): Ship {
  if (damage <= 0) return ship
  // Escape Mode grants full damage immunity to both HP and shield.
  if (ship.escapeMode !== null) return ship
  const shieldAbsorb = Math.min(ship.shield, damage)
  const hpDamage = damage - shieldAbsorb
  // Flash white only on HP damage (a shield absorb reads via its ring), throttled
  // so continuous damage — a wandering black hole core — pulses white now and then
  // instead of pinning the sprite solid white.
  const flashing = hpDamage > 0 && ship.hitFlashCooldown <= 0
  return {
    ...ship,
    shield: ship.shield - shieldAbsorb,
    // Any hit to the shield resets the regen timer — healing only begins after
    // 3 seconds with no damage taken.
    shieldCooldownRemaining: shieldAbsorb > 0 ? SHIELD_COOLDOWN : ship.shieldCooldownRemaining,
    hp: ship.hp - hpDamage,
    hitFlash: flashing ? ANIMATION.hitFlash : ship.hitFlash,
    hitFlashCooldown: flashing ? ANIMATION.hitFlashThrottle : ship.hitFlashCooldown,
  }
}

// Drives Escape Mode each tick. Returns the updated ship plus any flame trail
// particles spawned this frame. When escape is over the field is nulled out.
export function tickEscapeMode(
  ship: Ship,
  dt: number,
  trailAccumulator: number
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
    const pos = { x: ship.pos.x + vel.x * dt, y: ship.pos.y + vel.y * dt }
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
  const pos = { x: ship.pos.x + vel.x * dt, y: ship.pos.y + vel.y * dt }

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

// Drives the ship's auto-movement each tick. With an enemy around it keeps a
// loose flee-orbit — backing away to hold a respectful distance (so enemies stay
// close-ish) without ever truly escaping; it has no weapons, so survival is the
// player's job. With the lane clear it drifts gently forward, wrapping around the
// torus forever. A spent slingshot just resumes drifting from where it coasted to.
export function updateShipDrift(
  ship: Ship,
  dt: number,
  ctx: {
    forwardDir: Vec2
    target: Vec2 | null
    slowMult?: number
  }
): Ship {
  const { forwardDir, target } = ctx
  // A slow nebula drags the auto-drift the same way it drags everyone else.
  const slowMult = ctx.slowMult ?? 1

  const weavePhase = ship.weavePhase + dt * SECTOR.weaveFrequency
  // Overheating the slingshot saps engine power — the ship limps until it cools.
  const overheatMult = ship.slingOverheated ? SLINGSHOT.overheatSlowMult : 1
  const driftMomentum = Math.max(0, ship.driftMomentum - dt)

  let velX: number
  let velY: number

  if (target) {
    // Flee-orbit: a radial term holds the ship near `orbitRange` (closing a touch
    // when far, backing away when too close, biased outward) and a tangential term
    // circles the enemy, so it keeps its distance on a ring instead of ramming.
    // Steering toward the desired velocity (rather than snapping) keeps it flowy.
    const { x: dx, y: dy } = toroidalDelta(ship.pos, target)
    const dist = Math.hypot(dx, dy) || 1
    const dirX = dx / dist
    const dirY = dy / dist
    const speed = ship.speed * overheatMult * slowMult
    const orbitRange = SECTOR.orbitRange
    // Outward lean (fleeBias) shifts the equilibrium a little past orbitRange, so
    // the resting behaviour reads as backing away rather than circling in place.
    const radial = clamp(dist - orbitRange - speed * SECTOR.fleeBias, -speed, speed)
    const tangent = speed * SECTOR.orbitSpeedFraction
    // Circle whichever way the ship is already moving around the target, so it
    // sweeps a smooth ring instead of getting pinned oscillating on one side.
    // (Picking the side from the target's position made a point directly below
    // it an attractor — the ship would stall there and drift down with it.)
    const tangentialVel = dirX * ship.vel.y - dirY * ship.vel.x
    const hand = tangentialVel >= 0 ? 1 : -1
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
      SECTOR.driftSpeed * overheatMult * slowMult,
      { amplitude: SECTOR.weaveAmplitude, phase: weavePhase },
      dt
    )
    velX = drift.vel.x
    velY = drift.vel.y
  }

  // No walls on the torus — the world-wrap pass carries the ship around.
  const pos = { x: ship.pos.x + velX * dt, y: ship.pos.y + velY * dt }

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
