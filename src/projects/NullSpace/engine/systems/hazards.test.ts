import { describe, it, expect, beforeEach } from 'vitest'
import { generateHazardField, updateHazards } from './hazards'
import { HAZARD, WORLD_SIZE } from '../../data'
import { createShip } from '../entities/entity-creator'
import { toroidalDistance } from '../math/toroid'
import { HazardKind, ShipKind } from '../types'
import type { Hazard } from '../types'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(5))

describe('generateHazardField', () => {
  const center = { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y / 2 }

  it('scatters mines across the torus, all clear of the ship spawn', () => {
    const mines = generateHazardField(WORLD_SIZE, center)
    expect(mines.length).toBeGreaterThan(0)
    expect(mines.length).toBeLessThanOrEqual(HAZARD.mineCount)
    for (const m of mines) {
      expect(toroidalDistance(m.pos, center)).toBeGreaterThanOrEqual(HAZARD.forwardMargin)
    }
  })

  it('spreads mines across the world, not one narrow band', () => {
    const ys = generateHazardField(WORLD_SIZE, center).map((m) => m.pos.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(WORLD_SIZE.y * 0.3)
  })
})

describe('updateHazards', () => {
  it('damages the ship on overlap, then debounces until the cooldown elapses', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
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
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
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
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
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
