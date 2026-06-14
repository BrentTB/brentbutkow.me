import { describe, it, expect, beforeEach } from 'vitest'
import { createShip } from './entity-creator'
import { applySlingshot, tickFling, tickSlingHeat, updateShipDrift } from './ship'
import { applyUpgradesToShip, createInitialUpgrades } from '../upgrades'
import { ShipKind } from '../types'
import { UpgradeId } from '../upgrade-ids'
import { SLINGSHOT, WORLD_SIZE } from '../../data'
import { rng } from '../math/random'

beforeEach(() => {
  rng.reseed(42)
})

describe('applySlingshot', () => {
  it('sets a coast velocity within the jitter cone of the drag direction', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const flung = applySlingshot(ship, { dir: { x: 1, y: 0 }, charge: 1 })
    const speed = Math.hypot(flung.flingVel.x, flung.flingVel.y)
    expect(speed).toBeCloseTo(SLINGSHOT.baseSpeed, 0)
    // Deviation never exceeds the base jitter angle.
    expect(flung.flingVel.x / speed).toBeGreaterThanOrEqual(Math.cos(SLINGSHOT.baseJitter) - 1e-9)
  })

  it('arms the cooldown after a flick', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const flung = applySlingshot(ship, { dir: { x: 1, y: 0 }, charge: 1 })
    expect(flung.slingCooldownRemaining).toBe(ship.slingCooldown)
  })

  it('is a no-op while the cooldown is still ticking', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, slingCooldownRemaining: 0.5 }
    const result = applySlingshot(ship, { dir: { x: 1, y: 0 }, charge: 1 })
    expect(result).toBe(ship) // unchanged — flick ignored
    expect(result.flingVel).toEqual({ x: 0, y: 0 })
  })

  it('scales coast speed with charge', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    rng.reseed(7)
    const full = applySlingshot(ship, { dir: { x: 0, y: 1 }, charge: 1 })
    rng.reseed(7) // same seed → same jitter, so only charge differs
    const half = applySlingshot(ship, { dir: { x: 0, y: 1 }, charge: 0.5 })
    const sFull = Math.hypot(full.flingVel.x, full.flingVel.y)
    const sHalf = Math.hypot(half.flingVel.x, half.flingVel.y)
    expect(sHalf).toBeCloseTo(sFull * 0.5, 1)
  })

  it('applies angular scatter — the throw is not perfectly precise', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    let deviated = false
    for (let s = 1; s <= 8; s++) {
      rng.reseed(s)
      const f = applySlingshot(ship, { dir: { x: 1, y: 0 }, charge: 1 })
      if (Math.abs(f.flingVel.y) > 1) deviated = true
    }
    expect(deviated).toBe(true)
  })
})

describe('tickFling', () => {
  it('coasts the ship along its fling velocity and decays it', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, flingVel: { x: 400, y: 0 } }
    const r = tickFling(ship, 0.1)
    expect(r.active).toBe(true)
    expect(r.ship.pos.x).toBeGreaterThan(base.pos.x)
    expect(Math.hypot(r.ship.flingVel.x, r.ship.flingVel.y)).toBeLessThan(400)
  })

  it('reports inactive and zeroes velocity once the coast is spent', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, flingVel: { x: 5, y: 0 } } // below the min coast speed
    const r = tickFling(ship, 0.1)
    expect(r.active).toBe(false)
    expect(r.ship.flingVel).toEqual({ x: 0, y: 0 })
  })

  it('is an inactive no-op when there is no fling velocity', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const r = tickFling(ship, 0.1)
    expect(r.active).toBe(false)
    expect(r.ship).toBe(ship)
  })

  it('coasts straight through an edge without bouncing (no walls on the torus)', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, pos: { x: base.radius + 5, y: 1500 }, flingVel: { x: -400, y: 0 } }
    const r = tickFling(ship, 0.1)
    expect(r.active).toBe(true)
    expect(r.ship.flingVel.x).toBeLessThan(0) // NOT reflected — keeps its heading
    expect(r.ship.pos.x).toBeLessThan(base.radius + 5) // passes the old wall freely
  })
})

describe('slingshot upgrades bake into the ship', () => {
  it('Power raises max coast speed', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.slingPower] = { currentTier: 3 }
    const upgraded = applyUpgradesToShip(ship, upgrades)
    expect(upgraded.slingMaxSpeed).toBeGreaterThan(ship.slingMaxSpeed)
    expect(upgraded.slingMaxSpeed).toBe(SLINGSHOT.baseSpeed + 120 + 140 + 140)
  })

  it('Control tightens jitter down to the floor', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.slingAccuracy] = { currentTier: 3 }
    const upgraded = applyUpgradesToShip(ship, upgrades)
    expect(upgraded.slingJitter).toBeLessThan(ship.slingJitter)
    expect(upgraded.slingJitter).toBeCloseTo(SLINGSHOT.minJitter, 5)
  })

  it('Cadence shortens the cooldown to the floor', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.slingCooldown] = { currentTier: 3 }
    const upgraded = applyUpgradesToShip(ship, upgrades)
    expect(upgraded.slingCooldown).toBeCloseTo(SLINGSHOT.minCooldown, 5)
    expect(upgraded.slingCooldown).toBeLessThan(ship.slingCooldown)
  })

  it('never drops jitter below the floor even past full investment', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.slingAccuracy] = { currentTier: 3 }
    const upgraded = applyUpgradesToShip(ship, upgrades)
    expect(upgraded.slingJitter).toBeGreaterThanOrEqual(SLINGSHOT.minJitter)
  })

  it('Heat Sink raises the cooling rate', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.slingHeatSink] = { currentTier: 3 }
    const upgraded = applyUpgradesToShip(ship, upgrades)
    expect(upgraded.slingCoolRate).toBeGreaterThan(ship.slingCoolRate)
    expect(upgraded.slingCoolRate).toBeLessThanOrEqual(SLINGSHOT.maxCoolRate)
  })
})

describe('slingshot heat', () => {
  it('adds heat scaled by charge', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const full = applySlingshot(ship, { dir: { x: 1, y: 0 }, charge: 1 })
    const half = applySlingshot(ship, { dir: { x: 1, y: 0 }, charge: 0.5 })
    expect(full.slingHeat).toBeCloseTo(SLINGSHOT.heatPerFling, 5)
    expect(half.slingHeat).toBeCloseTo(SLINGSHOT.heatPerFling * 0.5, 5)
  })

  it('overheats once heat reaches the cap', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const hot = { ...base, slingHeat: 0.7 }
    const flung = applySlingshot(hot, { dir: { x: 1, y: 0 }, charge: 1 })
    expect(flung.slingHeat).toBe(1)
    expect(flung.slingOverheated).toBe(true)
  })

  it('is locked out while overheated (flick ignored, no heat added)', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const overheated = { ...base, slingHeat: 1, slingOverheated: true }
    const result = applySlingshot(overheated, { dir: { x: 1, y: 0 }, charge: 1 })
    expect(result).toBe(overheated)
    expect(result.flingVel).toEqual({ x: 0, y: 0 })
  })

  it('cools over time but keeps the lockout until heat falls below re-engage (hysteresis)', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    // Just above the re-engage threshold → still overheated after cooling a touch.
    const stillHot = tickSlingHeat({ ...base, slingHeat: 0.6, slingOverheated: true }, 0.1)
    expect(stillHot.slingHeat).toBeLessThan(0.6)
    expect(stillHot.slingOverheated).toBe(true)
    // Cool enough to cross below re-engage → lockout clears.
    const cooled = tickSlingHeat({ ...base, slingHeat: 0.52, slingOverheated: true }, 0.5)
    expect(cooled.slingHeat).toBeLessThan(SLINGSHOT.heatReengage)
    expect(cooled.slingOverheated).toBe(false)
  })

  it('slows the ship while overheated', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    // No target so only the idle drift speed is under test — isolating the
    // overheat slowdown.
    const ctx = { forwardDir: { x: 0, y: -1 }, target: null }
    const normal = updateShipDrift(base, 0.1, ctx)
    const overheated = updateShipDrift({ ...base, slingOverheated: true }, 0.1, ctx)
    const moved = (a: typeof base, b: typeof base) =>
      Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)
    expect(moved(base, overheated)).toBeLessThan(moved(base, normal))
  })
})

describe('forward drift (post-slingshot)', () => {
  // No target (lane clear) so only the idle-drift heading is under test.
  // Forward is up (−y).
  const ctx = { forwardDir: { x: 0, y: -1 }, target: null }

  it('does not snap back after a fling — keeps going the way it was flung', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    // The frame the coast ends: landed heading backward (down, +y), momentum armed.
    const flung = {
      ...base,
      pos: { x: WORLD_SIZE.x / 2, y: 1500 },
      lastHeading: { x: 0, y: 1 },
      driftMomentum: 0.6,
    }
    const after = updateShipDrift(flung, 0.1, ctx)
    // Continues in the flung direction (down) — the old patrol would reverse to forward.
    expect(after.pos.y).toBeGreaterThan(flung.pos.y)
  })

  it('eases the momentum window down to zero', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const flung = { ...base, lastHeading: { x: 0, y: 1 }, driftMomentum: 0.05 }
    expect(updateShipDrift(flung, 0.1, ctx).driftMomentum).toBe(0)
  })

  it('drifts up (forward) when no momentum is armed and no enemies', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, pos: { x: WORLD_SIZE.x / 2, y: 1500 }, driftMomentum: 0 }
    expect(updateShipDrift(ship, 0.1, ctx).pos.y).toBeLessThan(ship.pos.y)
  })

  it('hunts toward a target when one is present', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, pos: { x: WORLD_SIZE.x / 2, y: 1500 } }
    // Target to the right, within half a world → the ship steers toward it (x increases).
    const after = updateShipDrift(ship, 0.1, {
      ...ctx,
      target: { x: ship.pos.x + 600, y: ship.pos.y },
    })
    expect(after.pos.x).toBeGreaterThan(ship.pos.x)
  })

  // Regression: the hunt orbit used to pick its circling side from the target's
  // position, which made a point directly below the target an attractor — the
  // ship stalled there (and drifted down with the enemy). It now circles the way
  // it's already moving, so a vertical target gets orbited, not hugged.
  it('orbits a vertical target instead of getting pinned below it', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    // Sitting below a target directly above it, already drifting sideways.
    let ship = { ...base, pos: { x: WORLD_SIZE.x / 2, y: 1500 }, vel: { x: 30, y: 0 } }
    const target = { x: WORLD_SIZE.x / 2, y: 1100 } // straight up (−y)
    for (let i = 0; i < 50; i++) ship = updateShipDrift(ship, 0.05, { ...ctx, target })
    // It swept well off the vertical axis (orbited) rather than oscillating on it.
    expect(Math.abs(ship.pos.x - WORLD_SIZE.x / 2)).toBeGreaterThan(100)
  })
})
