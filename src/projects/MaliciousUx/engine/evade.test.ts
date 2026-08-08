import { describe, expect, it } from 'vitest'
import { evadeSpot } from './evade'
import { HOSTILITY } from '../data'

const arena = { width: 400, height: 200 }
const size = { width: 40, height: 20 }
const middle = { x: 180, y: 90 }
const trigger = HOSTILITY.evadeRadius
const hop = HOSTILITY.hopDistance

const centreOf = (spot: { x: number; y: number }) => ({
  x: spot.x + size.width / 2,
  y: spot.y + size.height / 2,
})

const inside = (spot: { x: number; y: number }) =>
  spot.x >= 0 &&
  spot.y >= 0 &&
  spot.x + size.width <= arena.width &&
  spot.y + size.height <= arena.height

const hopFrom = (cursor: { x: number; y: number }, spot: { x: number; y: number }) =>
  evadeSpot({ cursor, spot, size, arena, triggerDistance: trigger, hopDistance: hop })

describe('evadeSpot', () => {
  it('leaves the target alone while the cursor is outside the trigger radius', () => {
    const spot = middle
    expect(hopFrom({ x: 0, y: 0 }, spot)).toBe(spot)
  })

  it('hops away from a cursor closing in from the left', () => {
    const centre = centreOf(middle)
    expect(hopFrom({ x: centre.x - 20, y: centre.y }, middle).x).toBeGreaterThan(middle.x)
  })

  /**
   * A hop is a fixed short distance, not however far it takes to break the trigger radius. Leaping clear
   * every time sent it straight to the far wall and made the chase pointless.
   */
  it('hops a fixed distance rather than however far it takes to get clear', () => {
    const centre = centreOf(middle)
    const next = hopFrom({ x: centre.x - 20, y: centre.y }, middle)

    expect(Math.hypot(next.x - middle.x, next.y - middle.y)).toBeCloseTo(hop, 5)
  })

  it('stays inside the arena', () => {
    const cornered = { x: 0, y: 0 }
    expect(inside(hopFrom(centreOf(cornered), cornered))).toBe(true)
  })

  /** Bouncing is what keeps it moving: a clamp would pin it in the corner the cursor pushed it into. */
  it('ricochets off a wall instead of pinning itself against it', () => {
    // Against the left wall with the cursor to its right, so the hop aims further left than there is room.
    const pinned = { x: 0, y: 90 }
    const cursor = { x: pinned.x + size.width + 10, y: centreOf(pinned).y }
    const next = hopFrom(cursor, pinned)

    expect(inside(next)).toBe(true)
    expect(next.x).toBeGreaterThan(pinned.x)
  })

  it('breaks left when the cursor lands dead centre, rather than dividing by zero', () => {
    const next = hopFrom(centreOf(middle), middle)

    expect(Number.isFinite(next.x)).toBe(true)
    expect(next.x).toBeLessThan(middle.x)
  })

  /**
   * The runaway this guards against shipped once: positions derived from the element's own measured
   * rectangle drifted while a CSS transition was mid-flight, and the target left the page. Hopping from
   * a given spot must always land within one hop of it, however many times it is called.
   */
  it('never lands further than one hop from where it started', () => {
    let spot = middle

    for (let chase = 0; chase < 40; chase += 1) {
      const cursor = { ...centreOf(spot), x: centreOf(spot).x - 12 }
      const next = hopFrom(cursor, spot)

      expect(Math.hypot(next.x - spot.x, next.y - spot.y)).toBeLessThanOrEqual(hop + 0.001)
      expect(inside(next)).toBe(true)
      spot = next
    }
  })
})
