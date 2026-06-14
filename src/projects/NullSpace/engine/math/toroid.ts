import { WORLD_SIZE } from '../../data'
import type { Vec2 } from '../types'

// The world is a torus: both axes wrap. These helpers express positions and
// spatial deltas in that topology, so distance / aim / collision always take the
// SHORT way across a seam instead of the long way around. The world is a fixed
// size (WORLD_SIZE), so they read it directly — no per-call threading.

// Shortest signed distance from `from` to `to` on one wrapping axis.
function axisDelta(from: number, to: number, size: number): number {
  let d = to - from
  if (d > size / 2) d -= size
  else if (d < -size / 2) d += size
  return d
}

// Coordinate modulo'd back into [0, size).
function axisWrap(v: number, size: number): number {
  return ((v % size) + size) % size
}

/** Wrap a position back into the world bounds. */
export function wrapPosition(pos: Vec2): Vec2 {
  return { x: axisWrap(pos.x, WORLD_SIZE.x), y: axisWrap(pos.y, WORLD_SIZE.y) }
}

/**
 * Shortest signed delta from `from` to `to` — the direction + length to use for
 * targeting, aiming, AoE, and collision. Never the long way around the torus.
 */
export function toroidalDelta(from: Vec2, to: Vec2): Vec2 {
  return {
    x: axisDelta(from.x, to.x, WORLD_SIZE.x),
    y: axisDelta(from.y, to.y, WORLD_SIZE.y),
  }
}

/** Shortest distance between two points on the torus. */
export function toroidalDistance(a: Vec2, b: Vec2): number {
  const d = toroidalDelta(a, b)
  return Math.sqrt(d.x * d.x + d.y * d.y)
}

/**
 * The image of `pos` nearest to `ref` (ref + shortest delta). Lets the renderer
 * and swept-collision treat a wrapped entity as if it were adjacent.
 */
export function nearestImage(ref: Vec2, pos: Vec2): Vec2 {
  const d = toroidalDelta(ref, pos)
  return { x: ref.x + d.x, y: ref.y + d.y }
}
