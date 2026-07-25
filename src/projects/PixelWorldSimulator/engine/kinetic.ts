import { Grid, MaterialBehavior, MaterialId, Velocity } from '../pixel-world.types'
import { cellIndex, markHotRow, swapCells, transformCell } from './grid'
import { MATERIALS, canDisplace } from './materials'
import { Rng } from './rng'

/**
 * Cells per tick a flying cell picks up downward. Set by how long a throw hangs: a cell shoved upward
 * turns around in about a third of a second, so it reads as thrown rather than as floating.
 */
const GRAVITY = 0.35
/** Speed kept per tick in the air. Without it a cell thrown sideways never stops travelling. */
const AIR_DRAG = 0.985
/**
 * Cells per tick a single cell may cover, per axis. It has to be generous: overlapping impulses compound,
 * and that compounding is the whole reason a thicker slab of TNT hits harder than a thin one. A low cap
 * throws the extra away, so doubling the charge changed nothing you could see.
 */
const MAX_SPEED = 16
/** Below this, in cells per tick, a cell has stopped being thrown and goes back to its normal class. */
const MIN_SPEED = 0.5
/** What a cell keeps after a bounce when its material has nothing springy about it: a thud. */
const DEFAULT_RESTITUTION = 0.12
/** How hard an impact has to land, in cells per tick, to break something breakable. */
const SHATTER_SPEED = 2.5
/** Share of the impact speed that carries into the fragments it just made. */
const SHATTER_SPREAD = 0.4
/**
 * Share of a bounce that becomes sideways travel when the ground under the cell is sloped. Without it a
 * ball landing on a hillside reflects straight back up and bounces on that one spot forever.
 */
const SLOPE_DEFLECT = 0.6
/** A little sideways wander on every bounce, so a ball does not repeat one line up and down. */
const BOUNCE_SCATTER = 0.12

/**
 * Cap on cells in flight. A blast big enough to exceed it should degrade into ordinary falling debris
 * rather than stall the tick, so the slowest entries are the ones dropped.
 */
const MAX_IN_FLIGHT = 3000

/** Hands a cell a velocity, adding to whatever it already had — impulses from two blasts compound. */
export function push(grid: Grid, index: number, vx: number, vy: number): void {
  const id = grid.material[index]
  if (id === MaterialId.empty) return

  const current = grid.velocity.get(index)
  if (current === undefined) {
    grid.velocity.set(index, { vx, vy, ox: 0, oy: 0 })
    return
  }
  current.vx += vx
  current.vy += vy
}

/**
 * Moves everything in flight, one cell at a time along its own path, bouncing off whatever it cannot
 * displace. This is the seam the powers and the explosives all write into: they only ever set a
 * velocity, and everything that looks physical after that happens here.
 *
 * Runs in sorted index order rather than map order, so a replayed seed produces an identical world —
 * insertion order depends on which blast happened to touch a cell first.
 */
export function moveKinetic(grid: Grid, rng: Rng): void {
  if (grid.velocity.size === 0) return

  const flying = [...grid.velocity.entries()].sort(([a], [b]) => a - b)
  // A fresh map for where things end up, so an impact that shatters glass mid-pass hands the fragments
  // their velocity without disturbing the list being walked.
  grid.velocity = new Map()

  for (const [index, motion] of flying) {
    const id = grid.material[index]
    // The cell it was tracking may have been eaten, burnt, or swapped away underneath it.
    if (id === MaterialId.empty || MATERIALS[id].behavior === MaterialBehavior.empty) continue

    const landed = travel(grid, index, motion, rng)
    const speed = Math.abs(motion.vx) + Math.abs(motion.vy)
    // Slow cells go back to their own class, but only once something is under them: a cell released
    // mid-air stops where it is, which turns the back half of every arc into a freeze frame.
    if (speed >= MIN_SPEED || !isSupported(grid, landed)) keep(grid, landed, motion)
  }

  trim(grid)
}

/** Whether there is something under this cell that it cannot push through — the floor of its fall. */
export function isSupported(grid: Grid, index: number): boolean {
  const below = index + grid.width
  if (below >= grid.material.length) return true
  // Ground that is itself falling is not ground. Without this a painted lump of rubber came apart one
  // row per tick, dribbling downward, instead of leaving as a mass and bouncing like a ball.
  if (grid.velocity.has(below)) return false
  return !canDisplace(grid.material[index], grid.material[below])
}

/** Files a cell's motion at where it landed, keeping its sub-cell remainder with it. */
function keep(grid: Grid, index: number, motion: Velocity): void {
  const existing = grid.velocity.get(index)
  if (existing === undefined) {
    grid.velocity.set(index, motion)
    return
  }
  existing.vx += motion.vx
  existing.vy += motion.vy
}

/** Drops the slowest cells once the map is over its cap: the fastest debris is the interesting debris. */
function trim(grid: Grid): void {
  if (grid.velocity.size <= MAX_IN_FLIGHT) return

  const slowestFirst = [...grid.velocity.entries()].sort(
    (a, b) => Math.abs(a[1].vx) + Math.abs(a[1].vy) - (Math.abs(b[1].vx) + Math.abs(b[1].vy))
  )
  for (let i = 0; i < slowestFirst.length - MAX_IN_FLIGHT; i++) {
    grid.velocity.delete(slowestFirst[i][0])
  }
}

/** Walks a cell along its path for one tick and returns where it ended up. */
function travel(grid: Grid, index: number, motion: Velocity, rng: Rng): number {
  motion.vy += GRAVITY
  motion.vx = clampSpeed(motion.vx * AIR_DRAG)
  motion.vy = clampSpeed(motion.vy * AIR_DRAG)

  motion.ox += motion.vx
  motion.oy += motion.vy

  let steps = Math.max(Math.abs(Math.trunc(motion.ox)), Math.abs(Math.trunc(motion.oy)))
  let at = index

  while (steps > 0) {
    steps--
    const dx = stepOf(motion.ox)
    const dy = stepOf(motion.oy)
    if (dx === 0 && dy === 0) break

    const moved = advance(grid, at, dx, dy, motion, rng)
    if (moved === at) break
    at = moved
  }

  return at
}

function clampSpeed(speed: number): number {
  return Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed))
}

/** One cell of travel along an axis, taken out of the carried remainder as it is used. */
function stepOf(remainder: number): number {
  if (remainder >= 1) return 1
  if (remainder <= -1) return -1
  return 0
}

/**
 * Tries the diagonal, then each axis on its own, and reflects whatever direction stayed blocked. A
 * cell that cannot go anywhere loses its remainder so it doesn't spend the rest of the tick grinding
 * against a wall.
 */
function advance(
  grid: Grid,
  at: number,
  dx: number,
  dy: number,
  motion: Velocity,
  rng: Rng
): number {
  const moved = slideTo(grid, at, dx, dy, motion)
  if (moved !== at) return moved

  if (dx !== 0 && dy !== 0) {
    const alongX = slideTo(grid, at, dx, 0, motion)
    if (alongX !== at) {
      bounce(grid, at, motion, false, true, rng)
      return alongX
    }
    const alongY = slideTo(grid, at, 0, dy, motion)
    if (alongY !== at) {
      bounce(grid, at, motion, true, false, rng)
      return alongY
    }
  }

  bounce(grid, at, motion, dx !== 0, dy !== 0, rng)
  return at
}

/** Moves one cell if the target yields, consuming that step from the remainder. */
function slideTo(grid: Grid, at: number, dx: number, dy: number, motion: Velocity): number {
  const x = (at % grid.width) + dx
  const y = Math.floor(at / grid.width) + dy
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return at

  const to = cellIndex(grid, x, y)
  if (!canDisplace(grid.material[at], grid.material[to])) {
    shatter(grid, to, motion)
    return at
  }

  swapCells(grid, at, to)
  // Marking both ends keeps the material pass from moving a cell that has already flown this tick.
  grid.moved[at] = 1
  grid.moved[to] = 1
  if (dx !== 0) motion.ox -= dx
  if (dy !== 0) motion.oy -= dy
  return to
}

/** Reflects the blocked axes, takes the material's restitution out of the speed, and rolls off a slope. */
function bounce(
  grid: Grid,
  at: number,
  motion: Velocity,
  blockedX: boolean,
  blockedY: boolean,
  rng: Rng
): void {
  const restitution = MATERIALS[grid.material[at]].restitution ?? DEFAULT_RESTITUTION

  if (blockedX) {
    motion.vx = -motion.vx * restitution
    motion.ox = 0
  }
  if (!blockedY) return

  const impact = Math.abs(motion.vy) * restitution
  motion.vy = -motion.vy * restitution
  motion.oy = 0
  if (impact > 0) deflect(grid, at, motion, impact, rng)
}

/**
 * Sends a bouncing cell off to the side, downhill where there is a downhill to take. A ball landing on a
 * hillside otherwise reflects straight back up and hops on that one spot until it runs out of speed.
 */
function deflect(grid: Grid, at: number, motion: Velocity, impact: number, rng: Rng): void {
  const x = at % grid.width
  const y = Math.floor(at / grid.width)
  const downhillLeft = openBelow(grid, at, x - 1, y + 1)
  const downhillRight = openBelow(grid, at, x + 1, y + 1)

  if (downhillLeft !== downhillRight) {
    motion.vx += (downhillRight ? 1 : -1) * impact * SLOPE_DEFLECT
    return
  }

  // Flat ground, or a pit with walls both sides: a nudge either way, so a ball still wanders instead of
  // tracing the same line up and down.
  motion.vx += (rng.chance(0.5) ? 1 : -1) * impact * BOUNCE_SCATTER
}

/** Whether the cell down and to one side is somewhere this cell could actually go. */
function openBelow(grid: Grid, at: number, x: number, y: number): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return false
  return canDisplace(grid.material[at], grid.material[cellIndex(grid, x, y)])
}

/** Breaks what a fast enough impact lands on, and hands the fragments some of the impact. */
function shatter(grid: Grid, target: number, motion: Velocity): void {
  const breaks = MATERIALS[grid.material[target]].shatters
  if (breaks === undefined) return

  const speed = Math.abs(motion.vx) + Math.abs(motion.vy)
  if (speed < SHATTER_SPEED) return

  transformCell(grid, target, breaks)
  markHotRow(grid, target)
  push(grid, target, motion.vx * SHATTER_SPREAD, motion.vy * SHATTER_SPREAD)
}
