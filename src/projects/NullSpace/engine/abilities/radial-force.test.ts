import { describe, it, expect } from 'vitest'
import {
  applyRadialForce,
  applyRadialForceToAsteroids,
  radialForceDisplacement,
  RadialForceMode,
} from './radial-force'
import { createAsteroid, updateAsteroids } from '../calamities/asteroids'
import { createEnemy } from '../entities/entity-creator'
import { AsteroidTier, EnemyKind } from '../types'

const center = { x: 1000, y: 1000 }

describe('radialForceDisplacement', () => {
  it('pushes a body away from the centre', () => {
    const d = radialForceDisplacement(
      { x: 1050, y: 1000 },
      center,
      200,
      100,
      RadialForceMode.push,
      0.1
    )
    expect(d.x).toBeGreaterThan(0) // body sits +x of centre → pushed further +x
    expect(d.y).toBeCloseTo(0, 6)
  })

  it('pulls a body toward the centre', () => {
    const d = radialForceDisplacement(
      { x: 1050, y: 1000 },
      center,
      200,
      100,
      RadialForceMode.pull,
      0.1
    )
    expect(d.x).toBeLessThan(0) // drawn back toward the centre
  })

  it('is zero outside the radius and at the dead centre', () => {
    expect(
      radialForceDisplacement({ x: 1300, y: 1000 }, center, 200, 100, RadialForceMode.push, 0.1)
    ).toEqual({ x: 0, y: 0 })
    expect(
      radialForceDisplacement({ ...center }, center, 200, 100, RadialForceMode.push, 0.1)
    ).toEqual({ x: 0, y: 0 })
  })

  it('applies full force on the inner plateau, weaker near the edge', () => {
    const inner = radialForceDisplacement(
      { x: center.x + 200 * 0.2, y: center.y },
      center,
      200,
      100,
      RadialForceMode.push,
      1
    )
    const edge = radialForceDisplacement(
      { x: center.x + 200 * 0.95, y: center.y },
      center,
      200,
      100,
      RadialForceMode.push,
      1
    )
    expect(Math.abs(inner.x)).toBeGreaterThan(Math.abs(edge.x))
  })
})

describe('applyRadialForce', () => {
  it('moves enemies inside the radius and leaves the rest untouched', () => {
    const near = createEnemy(EnemyKind.drone, { x: center.x + 40, y: center.y })
    const far = createEnemy(EnemyKind.drone, { x: center.x + 500, y: center.y })
    const [movedNear, movedFar] = applyRadialForce(
      [near, far],
      center,
      200,
      100,
      RadialForceMode.push,
      0.1
    )
    expect(movedNear.pos.x).toBeGreaterThan(near.pos.x)
    expect(movedFar.pos).toEqual(far.pos)
  })
})

describe('applyRadialForceToAsteroids', () => {
  it('gives the asteroid outward momentum rather than teleporting its position', () => {
    const a = createAsteroid(AsteroidTier.medium, { x: center.x + 40, y: center.y }, { x: 0, y: 0 })
    const [pushed] = applyRadialForceToAsteroids([a], center, 200, 100, RadialForceMode.push, 0.1)
    expect(pushed.vel.x).toBeGreaterThan(0) // gained velocity away from the centre...
    expect(pushed.pos.x).toBe(a.pos.x) // ...not an instant position shove
    expect(pushed.playerInteracted).toBe(true) // the player moved it → loot-eligible
  })

  it('keeps the imparted momentum after the force stops (no revert to original drift)', () => {
    let a = createAsteroid(AsteroidTier.medium, { x: center.x + 40, y: center.y }, { x: 0, y: 0 })
    for (let i = 0; i < 5; i++) {
      ;[a] = applyRadialForceToAsteroids([a], center, 200, 100, RadialForceMode.push, 0.1)
    }
    const flung = a.vel.x
    expect(flung).toBeGreaterThan(0)
    // Force gone: the rock coasts on the momentum it was given instead of snapping back.
    const before = a.pos.x
    ;[a] = updateAsteroids([a], 0.1)
    expect(a.pos.x).toBeGreaterThan(before) // still moving on its own
    expect(a.vel.x).toBeCloseTo(flung, 5) // momentum preserved
  })
})
