import { describe, it, expect, beforeEach } from 'vitest'
import { applyDamageToShip, applySlingshot, updateShipDrift } from './ship'
import { createShip } from './entity-creator'
import { DAMAGE_IFRAME, NEBULA, WORLD_SIZE } from '../../data'
import { ShipKind } from '../types'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(3))

describe('applyDamageToShip — post-hit invincibility', () => {
  // Zero shield so damage lands straight on HP, and arm nothing else.
  const bareShip = () => ({ ...createShip(ShipKind.fighter, WORLD_SIZE), shield: 0 })

  it('arms the i-frame on a hit that reaches HP', () => {
    const hit = applyDamageToShip(bareShip(), 10)
    expect(hit.hp).toBe(bareShip().hp - 10)
    expect(hit.damageIFrame).toBe(DAMAGE_IFRAME)
  })

  it('shrugs off further hits while the i-frame is active — a swarm can not chain a kill', () => {
    let ship = bareShip()
    const startHp = ship.hp
    ship = applyDamageToShip(ship, 10) // lands, arms i-frame
    // Nine more contacts in the same beat (no tick to decay the i-frame) do nothing.
    for (let i = 0; i < 9; i++) ship = applyDamageToShip(ship, 10)
    expect(ship.hp).toBe(startHp - 10)
  })

  it('does not arm the i-frame on a pure shield absorb — the shield still drains under fire', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), shield: 50 }
    const hit = applyDamageToShip(ship, 10)
    expect(hit.shield).toBe(40)
    expect(hit.hp).toBe(ship.hp)
    expect(hit.damageIFrame).toBe(0)
  })

  it('lands again once the i-frame has decayed to zero', () => {
    let ship = applyDamageToShip(bareShip(), 10)
    ship = { ...ship, damageIFrame: 0 } // simulate the frame tick draining it
    const startHp = ship.hp
    ship = applyDamageToShip(ship, 10)
    expect(ship.hp).toBe(startHp - 10)
  })
})

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
