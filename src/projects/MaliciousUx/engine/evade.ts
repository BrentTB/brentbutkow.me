import { Offset } from '../malicious-ux.types'

type Point = { x: number; y: number }
/** A DOMRect, narrowed to the parts the maths needs (so tests can hand over plain objects). */
type Box = { left: number; top: number; width: number; height: number }

const centreOf = (box: Box): Point => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
})

/** Keeps a value inside `[min, max]`, tolerating an inverted range (a target wider than its arena). */
const clamp = (value: number, min: number, max: number): number =>
  max < min ? min : Math.min(Math.max(value, min), max)

export type EvadeArgs = {
  cursor: Point
  /** The target where it currently sits, offset included. */
  target: Box
  /** The arena the target may never leave. */
  bounds: Box
  /** How close the cursor gets before the target bolts. */
  triggerDistance: number
  /** Where the target sits right now, relative to its resting position. */
  offset: Offset
}

/**
 * The next offset for a target dodging a cursor: it runs directly away along the cursor→target line,
 * far enough to break the trigger radius, then is clamped inside the arena. Returns the offset it was
 * given when the cursor is still outside the radius, so a caller can skip the state update.
 *
 * Cornered against a wall, running in a straight line stops working — the clamp leaves it a few pixels
 * from the cursor and easy to catch. It bolts to the furthest corner of the arena instead.
 *
 * The cursor landing dead centre has no direction to run from, so the target breaks left — anything
 * beats dividing by a zero-length vector and jumping to NaN.
 */
export function evadeOffset({
  cursor,
  target,
  bounds,
  triggerDistance,
  offset,
}: EvadeArgs): Offset {
  const centre = centreOf(target)
  const away = { x: centre.x - cursor.x, y: centre.y - cursor.y }
  const distance = Math.hypot(away.x, away.y)
  if (distance > triggerDistance) return offset

  const direction =
    distance === 0 ? { x: -1, y: 0 } : { x: away.x / distance, y: away.y / distance }
  const leap = triggerDistance - distance + triggerDistance / 2

  // Where the target's resting position is, backed out of its current on-screen box.
  const rest = { left: target.left - offset.x, top: target.top - offset.y }
  const wanted = {
    left: target.left + direction.x * leap,
    top: target.top + direction.y * leap,
  }

  const maxLeft = bounds.left + bounds.width - target.width
  const maxTop = bounds.top + bounds.height - target.height
  const landed = {
    left: clamp(wanted.left, bounds.left, maxLeft),
    top: clamp(wanted.top, bounds.top, maxTop),
  }

  const escaped =
    Math.hypot(
      landed.left + target.width / 2 - cursor.x,
      landed.top + target.height / 2 - cursor.y
    ) > triggerDistance
  const spot = escaped ? landed : furthestCorner(cursor, target, bounds)

  return { x: spot.left - rest.left, y: spot.top - rest.top }
}

/** The corner position that puts the most distance between the target's centre and the cursor. */
function furthestCorner(cursor: Point, target: Box, bounds: Box) {
  const maxLeft = Math.max(bounds.left, bounds.left + bounds.width - target.width)
  const maxTop = Math.max(bounds.top, bounds.top + bounds.height - target.height)
  const corners = [
    { left: bounds.left, top: bounds.top },
    { left: maxLeft, top: bounds.top },
    { left: bounds.left, top: maxTop },
    { left: maxLeft, top: maxTop },
  ]

  return corners.reduce((best, corner) => {
    const reach = (spot: { left: number; top: number }) =>
      Math.hypot(spot.left + target.width / 2 - cursor.x, spot.top + target.height / 2 - cursor.y)
    return reach(corner) > reach(best) ? corner : best
  })
}
