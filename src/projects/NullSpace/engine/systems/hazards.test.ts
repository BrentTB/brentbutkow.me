import { describe, it, expect, beforeEach } from 'vitest'
import { generateHazardField, updateHazards } from './hazards'
import { HAZARD, SECTOR } from '../../data'
import { createShip } from '../entities/entity-creator'
import { HazardKind, ShipKind } from '../types'
import type { Hazard } from '../types'
import { rng } from '../math/random'

const corridor = { x: SECTOR.width, y: SECTOR.length }

beforeEach(() => rng.reseed(5))

describe('generateHazardField', () => {
  const corridorCenterX = SECTOR.width / 2
  const corridorHalfWidth = corridorCenterX - SECTOR.lateralMargin
  const minY = 500
  const maxY = 5500

  it('keeps mines inside the corridor with a lateral gap at the edges', () => {
    const mines = generateHazardField({ corridorCenterX, corridorHalfWidth, minY, maxY })
    expect(mines).toHaveLength(HAZARD.mineCount)
    const lateral = corridorHalfWidth * HAZARD.lateralFraction
    for (const m of mines) {
      expect(Math.abs(m.pos.x - corridorCenterX)).toBeLessThanOrEqual(lateral)
      expect(m.pos.y).toBeGreaterThanOrEqual(minY)
      expect(m.pos.y).toBeLessThanOrEqual(maxY)
    }
  })

  // Regression: mines used to cluster around a single mid-corridor lane. They
  // should now spread across the whole corridor length.
  it('scatters mines across the corridor length, not one narrow band', () => {
    const ys = generateHazardField({ corridorCenterX, corridorHalfWidth, minY, maxY }).map(
      (m) => m.pos.y
    )
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan((maxY - minY) * 0.5)
  })
})

describe('updateHazards', () => {
  it('damages the ship on overlap, then debounces until the cooldown elapses', () => {
    const ship = createShip(ShipKind.fighter, corridor)
    const mine: Hazard = {
      id: 'm',
      kind: HazardKind.mine,
      pos: { ...ship.pos },
      radius: 26,
      damage: 35,
      hitCooldown: 0,
    }
    const first = updateHazards([mine], ship, 0.016)
    expect(first.shipDamage).toBe(35)
    expect(first.hazards[0].hitCooldown).toBeGreaterThan(0)

    const second = updateHazards(first.hazards, ship, 0.016)
    expect(second.shipDamage).toBe(0)
  })

  it('stacks damage from every mine overlapping the ship in one tick', () => {
    const ship = createShip(ShipKind.fighter, corridor)
    const mineAt = (id: string): Hazard => ({
      id,
      kind: HazardKind.mine,
      pos: { ...ship.pos },
      radius: 26,
      damage: 35,
      hitCooldown: 0,
    })
    // A dense cluster overlap is intended to be punishing — damage sums, uncapped.
    expect(updateHazards([mineAt('a'), mineAt('b')], ship, 0.016).shipDamage).toBe(70)
  })

  it('deals no damage when the ship is clear of every mine', () => {
    const ship = createShip(ShipKind.fighter, corridor)
    const mine: Hazard = {
      id: 'm',
      kind: HazardKind.mine,
      pos: { x: ship.pos.x + 999, y: ship.pos.y },
      radius: 26,
      damage: 35,
      hitCooldown: 0,
    }
    expect(updateHazards([mine], ship, 0.016).shipDamage).toBe(0)
  })
})
