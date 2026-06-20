import { describe, it, expect, beforeEach } from 'vitest'
import { generateHazardField, updateHazards } from './hazards'
import { HAZARD, WORLD_SIZE } from '../../data'
import { createAlly, createEnemy, createShip } from '../entities/entity-creator'
import { toroidalDistance } from '../math/toroid'
import { EnemyKind, HazardKind, ShipKind } from '../types'
import type { Hazard, Vec2 } from '../types'
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
  const ship = createShip(ShipKind.fighter, WORLD_SIZE)
  const mineAt = (pos: Vec2): Hazard => ({
    id: 'm',
    kind: HazardKind.mine,
    pos,
    radius: HAZARD.mineRadius,
    damage: HAZARD.mineDamage,
  })
  // Far enough from the ship that its blast can't reach the player.
  const farPos = { x: ship.pos.x + 600, y: ship.pos.y }

  it('detonates and is consumed when the ship touches it, damaging the ship', () => {
    const r = updateHazards([mineAt({ ...ship.pos })], ship, [], [])
    expect(r.hazards).toHaveLength(0) // single-use — gone after one hit
    expect(r.ship.shield + r.ship.hp).toBe(ship.shield + ship.hp - HAZARD.mineDamage)
  })

  it('detonates on an enemy and damages it — mines now hit enemies too', () => {
    const enemy = { ...createEnemy(EnemyKind.drone, { ...farPos }), hp: 500, maxHp: 500 }
    const r = updateHazards([mineAt({ ...farPos })], ship, [enemy], [])
    expect(r.hazards).toHaveLength(0)
    expect(r.enemies[0].hp).toBe(500 - HAZARD.mineDamage)
    expect(r.ship).toBe(ship) // ship far away — untouched
  })

  it('detonates on an ally and damages it', () => {
    const ally = { ...createAlly({ ...farPos }), hp: 500, maxHp: 500 }
    const r = updateHazards([mineAt({ ...farPos })], ship, [], [ally])
    expect(r.hazards).toHaveLength(0)
    expect(r.allies[0].hp).toBe(500 - HAZARD.mineDamage)
  })

  it('leaves a mine untouched when nothing overlaps it', () => {
    const r = updateHazards([mineAt({ x: ship.pos.x + 999, y: ship.pos.y })], ship, [], [])
    expect(r.hazards).toHaveLength(1)
    expect(r.ship).toBe(ship)
  })
})
