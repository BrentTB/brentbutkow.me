export type Point = { x: number; y: number }
type Size = { width: number; height: number }

/** Keeps a value inside `[min, max]`, tolerating an inverted range (a target wider than its arena). */
const clamp = (value: number, min: number, max: number): number =>
  max < min ? min : Math.min(Math.max(value, min), max)

/**
 * Folds a value back off the ends of its range instead of stopping at them, so a hop aimed past a wall
 * comes back into the arena at the angle it arrived. This is what makes the target ricochet around the
 * pen rather than pinning itself in whichever corner the cursor pushed it towards.
 */
function bounce(value: number, min: number, max: number): number {
  if (max <= min) return min
  if (value < min) return clamp(min + (min - value), min, max)
  if (value > max) return clamp(max - (value - max), min, max)
  return value
}

export type EvadeArgs = {
  /** The cursor, in the arena's own coordinates. */
  cursor: Point
  /** Where the target sits now, in the arena's own coordinates. */
  spot: Point
  /** The target's size. */
  size: Size
  /** The arena's inner size. The target's box stays wholly inside it. */
  arena: Size
  /** How close the cursor gets before the target hops. */
  triggerDistance: number
  /** How far one hop carries it. Short enough to stay chaseable. */
  hopDistance: number
}

/**
 * Where a target dodging a cursor should sit next, in the arena's coordinates. It hops a fixed short
 * distance away along the cursor→target line and ricochets off the walls, which keeps it moving inside
 * the pen and keeps it catchable. Returns the spot it was given when the cursor is outside the trigger
 * radius, so a caller can skip the state update.
 *
 * Everything is arena-relative on purpose. Deriving the position from the element's own measured
 * rectangle instead let a CSS transition feed a half-finished position back in, and the error compounded
 * a hop at a time until the target left the building.
 *
 * A fixed hop is the other half of that: leaping far enough to break the trigger radius every time sent
 * it straight to the far wall and made the chase pointless.
 *
 * The cursor landing dead centre has no direction to run from, so the target breaks left — anything
 * beats dividing by a zero-length vector and hopping to NaN.
 */
export function evadeSpot({
  cursor,
  spot,
  size,
  arena,
  triggerDistance,
  hopDistance,
}: EvadeArgs): Point {
  const centre = { x: spot.x + size.width / 2, y: spot.y + size.height / 2 }
  const away = { x: centre.x - cursor.x, y: centre.y - cursor.y }
  const distance = Math.hypot(away.x, away.y)
  if (distance > triggerDistance) return spot

  const direction =
    distance === 0 ? { x: -1, y: 0 } : { x: away.x / distance, y: away.y / distance }

  return {
    x: bounce(spot.x + direction.x * hopDistance, 0, arena.width - size.width),
    y: bounce(spot.y + direction.y * hopDistance, 0, arena.height - size.height),
  }
}
