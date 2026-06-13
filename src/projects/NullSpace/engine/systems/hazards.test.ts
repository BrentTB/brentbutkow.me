import { describe, it, expect, beforeEach } from 'vitest'
import { generateHazardLane, updateHazards } from './hazards'
import { HAZARD, SECTOR } from '../../data'
import { createShip } from '../entities/entity-creator'
import { HazardKind, ShipKind } from '../types'
import type { Hazard } from '../types'
import { rng } from '../math/random'

const corridor = { x: SECTOR.width, y: SECTOR.length }

beforeEach(() => rng.reseed(5))

describe('generateHazardLane', () => {
  it('places mines within the corridor band', () => {
    const corridorCenterX = SECTOR.width / 2
    const corridorHalfWidth = corridorCenterX - SECTOR.lateralMargin
    const laneY = 3000
    const mines = generateHazardLane({ corridorCenterX, corridorHalfWidth, laneY })
    expect(mines).toHaveLength(HAZARD.minesPerCluster)
    for (const m of mines) {
      // Inset to 0.6 of the half-width — the gap that keeps a lateral dash through.
      expect(Math.abs(m.pos.x - corridorCenterX)).toBeLessThanOrEqual(corridorHalfWidth * 0.6)
      expect(Math.abs(m.pos.y - laneY)).toBeLessThanOrEqual(HAZARD.clusterSpread)
    }
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
