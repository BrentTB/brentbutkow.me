import { describe, it, expect } from 'vitest'
import { applyRadialForce, radialForceDisplacement, RadialForceMode } from './radial-force'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind } from '../types'

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
