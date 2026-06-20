import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildNebulaField,
  enemyVisibleToPlayerSide,
  hazeJitterAt,
  inZone,
  jitterAim,
  nebulaRadiusAt,
  playerVisibleToEnemy,
  sightCircles,
  slowMultAt,
  visibleTargetForEnemy,
} from './nebula-vision'
import type { NebulaField } from './nebula-vision'
import { createNebula } from './nebula'
import { createAlly, createShip } from '../entities/entity-creator'
import { NEBULA, WORLD_SIZE } from '../../data'
import { NebulaVariant, ShipKind } from '../types'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(11))

const center = { x: 1000, y: 1000 }
const grown = NEBULA.growDuration + 1
const fieldWith = (over: Partial<NebulaField>): NebulaField => ({
  fog: [],
  slow: [],
  haze: [],
  circles: [],
  ...over,
})

describe('nebulaRadiusAt', () => {
  it('grows start→max over growDuration, then holds', () => {
    const n = createNebula(NebulaVariant.fog, center, { x: 0, y: 0 })
    expect(nebulaRadiusAt(n, 0)).toBeCloseTo(NEBULA.startRadius, 5)
    expect(nebulaRadiusAt(n, NEBULA.growDuration)).toBeCloseTo(NEBULA.maxRadius, 5)
    expect(nebulaRadiusAt(n, NEBULA.growDuration + 99)).toBe(NEBULA.maxRadius)
  })
})

describe('buildNebulaField', () => {
  it('splits live zones by variant and adds player + ally sight bubbles', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
    const ally = createAlly({ x: center.x + 50, y: center.y })
    const effects = [
      { ...createNebula(NebulaVariant.fog, center, { x: 0, y: 0 }), elapsed: grown },
      { ...createNebula(NebulaVariant.slow, { x: 2200, y: 2200 }, { x: 0, y: 0 }), elapsed: grown },
    ]
    const field = buildNebulaField(effects, ship, [ally])
    expect(field.fog).toHaveLength(1)
    expect(field.slow).toHaveLength(1)
    expect(field.haze).toHaveLength(0)
    expect(field.fog[0].radius).toBeCloseTo(NEBULA.maxRadius, 5)
    expect(field.circles).toHaveLength(2) // player + one ally
    expect(field.circles[0].radius).toBe(NEBULA.sightRadius)
    expect(field.circles[1].radius).toBe(NEBULA.allySightRadius)
  })
})

describe('inZone', () => {
  const zones = [{ pos: center, radius: 200 }]

  it('counts the rim as inside (<=) and anything past it as outside', () => {
    expect(inZone(center, zones)).toBe(true)
    expect(inZone({ x: center.x + 200, y: center.y }, zones)).toBe(true) // exactly on the rim
    expect(inZone({ x: center.x + 201, y: center.y }, zones)).toBe(false)
    expect(inZone(center, [])).toBe(false)
  })
})

describe('sightCircles', () => {
  it('gives the player the larger bubble and each ally a smaller one', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
    const ally = createAlly({ x: center.x + 50, y: center.y })
    const circles = sightCircles(ship, [ally])
    expect(circles).toHaveLength(2)
    expect(circles[0]).toEqual({ center: ship.pos, radius: NEBULA.sightRadius })
    expect(circles[1].radius).toBe(NEBULA.allySightRadius)
    expect(NEBULA.allySightRadius).toBeLessThan(NEBULA.sightRadius)
  })
})

describe('slowMultAt / hazeJitterAt', () => {
  const slow = [{ pos: center, radius: 200 }]
  const haze = [{ pos: center, radius: 200 }]

  it('slowMultAt drags inside a slow zone, full speed outside', () => {
    expect(slowMultAt(center, slow)).toBe(NEBULA.slowMult)
    expect(slowMultAt({ x: center.x + 500, y: center.y }, slow)).toBe(1)
    expect(slowMultAt(center, [])).toBe(1)
  })

  it('hazeJitterAt peaks at the centre and fades to 0 at the rim', () => {
    expect(hazeJitterAt(center, haze)).toBeCloseTo(NEBULA.hazeJitterMax, 5)
    const mid = hazeJitterAt({ x: center.x + 100, y: center.y }, haze)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(NEBULA.hazeJitterMax)
    expect(hazeJitterAt({ x: center.x + 999, y: center.y }, haze)).toBe(0)
  })
})

describe('enemyVisibleToPlayerSide', () => {
  const fog = [{ pos: center, radius: 200 }]

  it('an enemy clear of all fog is visible', () => {
    expect(enemyVisibleToPlayerSide({ x: center.x + 999, y: center.y }, fieldWith({ fog }))).toBe(
      true
    )
  })

  it('an enemy in fog is concealed unless inside a sight bubble', () => {
    expect(enemyVisibleToPlayerSide(center, fieldWith({ fog }))).toBe(false)
    const revealed = fieldWith({ fog, circles: [{ center, radius: 80 }] })
    expect(enemyVisibleToPlayerSide(center, revealed)).toBe(true)
  })
})

describe('playerVisibleToEnemy (faithful fog rule)', () => {
  const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
  const fog = [{ pos: center, radius: 200 }] // the ship sits inside this fog

  it('a player in the open is always fair game', () => {
    expect(playerVisibleToEnemy({ x: 2200, y: 2200 }, ship, [], [])).toBe(true)
  })

  it('a player in fog is hidden from a distant enemy', () => {
    const far = { x: center.x + NEBULA.sightRadius + 50, y: center.y }
    expect(playerVisibleToEnemy(far, ship, [], fog)).toBe(false)
  })

  it('a player in fog is seen by an enemy inside the player bubble', () => {
    const near = { x: center.x + NEBULA.sightRadius - 20, y: center.y }
    expect(playerVisibleToEnemy(near, ship, [], fog)).toBe(true)
  })

  it('a player in fog standing in an ally bubble is visible to a distant enemy', () => {
    const ally = createAlly({ x: center.x + 20, y: center.y }) // within allySightRadius of ship
    const far = { x: center.x + 2000, y: center.y }
    expect(playerVisibleToEnemy(far, ship, [ally], fog)).toBe(true)
  })
})

describe('visibleTargetForEnemy', () => {
  const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
  const fog = [{ pos: center, radius: 200 }]

  it('returns null when fog hides the player and there are no allies → wander', () => {
    const far = { x: center.x + NEBULA.sightRadius + 80, y: center.y }
    expect(visibleTargetForEnemy(far, ship, [], fog)).toBeNull()
  })

  it('returns the player position when visible', () => {
    expect(visibleTargetForEnemy({ x: 2200, y: 2200 }, ship, [], [])).toEqual(ship.pos)
  })
})

describe('jitterAim', () => {
  it('keeps the range, bounds the deviation, and is a no-op at zero', () => {
    const from = { x: 0, y: 0 }
    const target = { x: 100, y: 0 }
    expect(jitterAim(from, target, 0)).toEqual(target)
    const j = jitterAim(from, target, 0.4)
    expect(Math.hypot(j.x, j.y)).toBeCloseTo(100, 4) // range preserved
    expect(Math.abs(Math.atan2(j.y, j.x))).toBeLessThanOrEqual(0.4 + 1e-9) // within ±jitter
  })
})
