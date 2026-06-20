import { describe, it, expect, beforeEach } from 'vitest'
import { generateHazardField, replenishHazardField, updateHazards } from './hazards'
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

describe('replenishHazardField', () => {
  const center = { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y / 2 }
  const mineAt = (pos: Vec2): Hazard => ({
    id: 'x',
    kind: HazardKind.mine,
    pos,
    radius: HAZARD.mineRadius,
    damage: HAZARD.mineDamage,
  })

  it('tops a thinned field back up, keeping the existing mines and adding the shortfall', () => {
    const existing = [mineAt({ x: 100, y: 100 }), mineAt({ x: 200, y: 200 })]
    const out = replenishHazardField(existing, WORLD_SIZE, center)
    expect(out.length).toBeGreaterThan(existing.length) // refilled
    expect(out.length).toBeLessThanOrEqual(HAZARD.mineCount) // never overfills
    expect(out.slice(0, 2)).toEqual(existing) // originals kept, new ones appended
    for (const m of out.slice(2)) {
      expect(toroidalDistance(m.pos, center)).toBeGreaterThanOrEqual(HAZARD.forwardMargin)
    }
  })

  it('is a no-op when the field is already at capacity', () => {
    const full = Array.from({ length: HAZARD.mineCount }, (_, i) => mineAt({ x: 50 + i, y: 50 }))
    expect(replenishHazardField(full, WORLD_SIZE, center)).toBe(full) // same ref — untouched
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
