import { describe, it, expect, beforeEach } from 'vitest'
import { applySlingshot, updateShipDrift } from './ship'
import { createShip } from './entity-creator'
import { NEBULA, WORLD_SIZE } from '../../data'
import { ShipKind } from '../types'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(3))

describe('slow nebula hinders the ship', () => {
  it('only gently weakens the slingshot launch (the gentler sling multiplier)', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const fling = { dir: { x: 1, y: 0 }, charge: 1 }
    const full = applySlingshot(ship, fling, 1)
    const dragged = applySlingshot(ship, fling, NEBULA.slowSlingMult)
    const fullSpeed = Math.hypot(full.flingVel.x, full.flingVel.y)
    const dragSpeed = Math.hypot(dragged.flingVel.x, dragged.flingVel.y)
    expect(dragSpeed).toBeCloseTo(fullSpeed * NEBULA.slowSlingMult, 4)
    // The sling is hindered far less than the general drag, so escape stays viable.
    expect(NEBULA.slowSlingMult).toBeGreaterThan(NEBULA.slowMult)
  })

  it('drags the auto-drift (covers less ground, but still moves)', () => {
    const start = { x: 1000, y: 1000 }
    const ctx = { forwardDir: { x: 1, y: 0 }, target: null }
    let full = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...start } }
    let slow = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...start } }
    for (let i = 0; i < 10; i++) {
      full = updateShipDrift(full, 0.1, { ...ctx, slowMult: 1 })
      slow = updateShipDrift(slow, 0.1, { ...ctx, slowMult: NEBULA.slowMult })
    }
    const movedFull = Math.hypot(full.pos.x - start.x, full.pos.y - start.y)
    const movedSlow = Math.hypot(slow.pos.x - start.x, slow.pos.y - start.y)
    expect(movedSlow).toBeGreaterThan(0)
    expect(movedSlow).toBeLessThan(movedFull)
  })
})
