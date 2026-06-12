import { describe, it, expect } from 'vitest'
import { SLING_MAX_DRAG_PX, moveGesture, releaseGesture, tryGrabShip } from './sling-gesture'

const SHIP = { x: 500, y: 500 }

describe('tryGrabShip', () => {
  it('grabs when the press lands within the grab radius of the ship', () => {
    const grab = tryGrabShip({ x: 530, y: 500 }, SHIP, { x: 100, y: 100 })
    expect(grab).not.toBeNull()
    expect(grab!.start).toEqual({ x: 100, y: 100 })
    expect(grab!.pressWorld).toEqual({ x: 530, y: 500 })
  })

  it('falls through (null) when the press is outside the grab radius', () => {
    expect(tryGrabShip({ x: 700, y: 500 }, SHIP, { x: 100, y: 100 })).toBeNull()
  })
})

describe('releaseGesture', () => {
  const grab = tryGrabShip({ x: 510, y: 500 }, SHIP, { x: 100, y: 100 })!

  it('a barely-moved release is a tap at the original press point', () => {
    const release = releaseGesture(moveGesture(grab, { x: 105, y: 100 }))
    expect(release).toEqual({ tapWorld: { x: 510, y: 500 } })
  })

  it('a real drag flings along the drag direction with distance-based charge', () => {
    const release = releaseGesture(moveGesture(grab, { x: 100 + SLING_MAX_DRAG_PX / 2, y: 100 }))
    if (!('fling' in release)) throw new Error('expected a fling')
    expect(release.fling.dir).toEqual({ x: 1, y: 0 })
    expect(release.fling.charge).toBeCloseTo(0.5)
  })

  it('charge clamps to 1 beyond the max drag distance', () => {
    const release = releaseGesture(moveGesture(grab, { x: 100, y: 100 + SLING_MAX_DRAG_PX * 3 }))
    if (!('fling' in release)) throw new Error('expected a fling')
    expect(release.fling.dir.y).toBeCloseTo(1)
    expect(release.fling.charge).toBe(1)
  })
})
