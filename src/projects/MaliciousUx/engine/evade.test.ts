import { describe, expect, it } from 'vitest'
import { evadeOffset } from './evade'
import { HOSTILITY } from '../data'

const bounds = { left: 0, top: 0, width: 400, height: 200 }
const target = { left: 180, top: 90, width: 40, height: 20 }
const atRest = { x: 0, y: 0 }
const trigger = HOSTILITY.evadeRadius

const centreOf = (box: { left: number; top: number; width: number; height: number }) => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
})

describe('evadeOffset', () => {
  it('leaves the target alone while the cursor is outside the trigger radius', () => {
    const offset = evadeOffset({
      cursor: { x: 0, y: 0 },
      target,
      bounds,
      triggerDistance: trigger,
      offset: atRest,
    })

    expect(offset).toBe(atRest)
  })

  it('runs away from a cursor closing in from the left', () => {
    const centre = centreOf(target)
    const offset = evadeOffset({
      cursor: { x: centre.x - 20, y: centre.y },
      target,
      bounds,
      triggerDistance: trigger,
      offset: atRest,
    })

    expect(offset.x).toBeGreaterThan(0)
  })

  it('breaks the trigger radius rather than shuffling a few pixels', () => {
    const centre = centreOf(target)
    const cursor = { x: centre.x - 20, y: centre.y }
    const offset = evadeOffset({ cursor, target, bounds, triggerDistance: trigger, offset: atRest })

    const moved = { ...target, left: target.left + offset.x, top: target.top + offset.y }
    const movedCentre = centreOf(moved)
    expect(Math.hypot(movedCentre.x - cursor.x, movedCentre.y - cursor.y)).toBeGreaterThan(trigger)
  })

  it('never leaves the arena', () => {
    const cornered = { ...target, left: bounds.left, top: bounds.top }
    const offset = evadeOffset({
      cursor: centreOf(cornered),
      target: cornered,
      bounds,
      triggerDistance: trigger,
      offset: atRest,
    })

    const left = cornered.left + offset.x
    const top = cornered.top + offset.y
    expect(left).toBeGreaterThanOrEqual(bounds.left)
    expect(top).toBeGreaterThanOrEqual(bounds.top)
    expect(left + cornered.width).toBeLessThanOrEqual(bounds.left + bounds.width)
    expect(top + cornered.height).toBeLessThanOrEqual(bounds.top + bounds.height)
  })

  it('bolts to the far corner when a wall blocks the straight-line escape', () => {
    // Pinned to the left wall with the cursor on top of it: running left is clamped to nothing.
    const pinned = { ...target, left: bounds.left, top: bounds.top }
    const cursor = centreOf(pinned)
    const offset = evadeOffset({
      cursor,
      target: pinned,
      bounds,
      triggerDistance: trigger,
      offset: atRest,
    })

    const moved = { ...pinned, left: pinned.left + offset.x, top: pinned.top + offset.y }
    const movedCentre = centreOf(moved)
    expect(Math.hypot(movedCentre.x - cursor.x, movedCentre.y - cursor.y)).toBeGreaterThan(trigger)
    expect(moved.left + moved.width).toBe(bounds.left + bounds.width)
  })

  it('measures the leap from the resting position, so offsets do not compound', () => {
    const displaced = { ...target, left: target.left + 30 }
    const offset = evadeOffset({
      cursor: { x: displaced.left + displaced.width / 2 - 20, y: 100 },
      target: displaced,
      bounds,
      triggerDistance: trigger,
      offset: { x: 30, y: 0 },
    })

    // The returned offset is relative to rest (target.left), not to where the target already sits.
    expect(target.left + offset.x).toBeGreaterThan(displaced.left)
  })
})
