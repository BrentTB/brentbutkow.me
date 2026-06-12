import { describe, it, expect, beforeEach } from 'vitest'
import { createShip } from './entity-creator'
import { applySlingshot, tickFling, tickSlingHeat, updateShipPatrol } from './ship'
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
    const r = tickFling(ship, 0.1, WORLD_SIZE)
    expect(r.active).toBe(true)
    expect(r.ship.pos.x).toBeGreaterThan(base.pos.x)
    expect(Math.hypot(r.ship.flingVel.x, r.ship.flingVel.y)).toBeLessThan(400)
  })

  it('reports inactive and zeroes velocity once the coast is spent', () => {
    const base = createShip(ShipKind.fighter, WORLD_SIZE)
    const ship = { ...base, flingVel: { x: 5, y: 0 } } // below the min coast speed
    const r = tickFling(ship, 0.1, WORLD_SIZE)
    expect(r.active).toBe(false)
    expect(r.ship.flingVel).toEqual({ x: 0, y: 0 })
  })

  it('is an inactive no-op when there is no fling velocity', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const r = tickFling(ship, 0.1, WORLD_SIZE)
    expect(r.active).toBe(false)
    expect(r.ship).toBe(ship)
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
    // Park both well away from the patrol target so they coast at full max speed.
    const far = { x: base.pos.x + 500, y: base.pos.y }
    const normal = updateShipPatrol({ ...base, pos: { ...far } }, 0.1, WORLD_SIZE)
    const overheated = updateShipPatrol(
      { ...base, pos: { ...far }, slingOverheated: true },
      0.1,
      WORLD_SIZE
    )
    const moved = (a: typeof base, b: typeof base) =>
      Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)
    expect(moved({ ...base, pos: far }, overheated)).toBeLessThan(
      moved({ ...base, pos: far }, normal)
    )
  })
})
