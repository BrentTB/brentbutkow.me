import { Grid, MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'
import { cellIndex, placeMaterial, transformCell } from './grid'
import { Rng } from './rng'

/** Chance per tick that a drop of acid eats one of its neighbours. */
const DISSOLVE_CHANCE = 0.14
/**
 * Chance per tick that a plant cell puts out a shoot. High on purpose: a falling drop is only touching
 * for a tick or two, and at a low chance pouring water past a vine did nothing at all. What bounds the
 * spread is the growth budget in `data`, not this number, so speed and extent tune separately.
 */
const GROWTH_CHANCE = 0.5
/**
 * Frost is a contact rule, not a temperature race — driven off thresholds it either stalled a degree
 * short of freezing or took a whole pool in a second. Ice grabs water it touches almost every time,
 * then sits out `FROST_COOLDOWN` ticks: that keeps the creep slow while still catching a drop that is
 * only next to the cube for a moment.
 */
const FROST_ON_CONTACT = 0.8
/**
 * Each cell draws its own rest from this range. A single shared cooldown phase-locks the whole sheet:
 * a batch of cells freezes on the same tick, rests in lockstep, and wakes together, so the ice advances
 * in visible pulses instead of creeping.
 */
const FROST_REST_MIN = 25
const FROST_REST_SPREAD = 70

/** Neighbour offsets. */
const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
]

/**
 * Where a shoot goes, as repeated entries for weighting: upward most often, but every direction is
 * possible. A strict up-then-sideways-then-down order grew perfectly flat-bottomed blobs, because in a
 * pool there was always water above to take first.
 */
const SHOOT_BIAS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, -1],
  [0, -1],
  [-1, 0],
  [-1, 0],
  [1, 0],
  [1, 0],
  [0, 1],
  [0, 1],
]

/**
 * The chemistry the heat field can't express: acid eating what it touches, and plants creeping into
 * water. Everything temperature-driven lives in heat.ts instead.
 */
export function applyReactions(grid: Grid, rng: Rng): void {
  const { width, height, material } = grid

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const id = material[index]

      if (id === MaterialId.acid) dissolve(grid, rng, x, y, index)
      else if (id === MaterialId.plant) grow(grid, rng, x, y, index)
      else if (id === MaterialId.vine) creep(grid, rng, x, y)
      else if (id === MaterialId.ice) frost(grid, rng, x, y, index)
    }
  }
}

function dissolve(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  // Rotate where the scan starts, or acid would always eat upward first.
  const target = pickNeighbour(
    grid,
    x,
    y,
    (id) => {
      if (id === MaterialId.empty || id === MaterialId.acid) return false
      return MATERIALS[id].acidProof !== true
    },
    Math.floor(rng.next() * NEIGHBOURS.length)
  )
  if (target < 0) return

  // Tougher material soaks up more acid before it gives, so stone corrodes slowly and sand melts away.
  const resistance = MATERIALS[grid.material[target]].acidResistance ?? 1
  if (!rng.chance(DISSOLVE_CHANCE * resistance)) return

  transformCell(grid, target, MaterialId.empty)
  grid.data[index] -= 1
  if (grid.data[index] === 0) transformCell(grid, index, MaterialId.empty)
}

/** Chance a shoot forks instead of handing its whole remaining budget to the new tip. */
const BRANCH_CHANCE = 0.25
/** Most a single step can cost a vine's budget. Varying it is what gives tendrils different lengths. */
const MAX_STEP_COST = 3

/**
 * A plant puts out one shoot into adjacent water and hands on what's left of its budget, so growth
 * creeps as a vine with a living tip and stays bounded per painted seed.
 *
 * Each step costs a random slice of the budget and sometimes forks, which is what stops the result
 * being a smooth disc: with a fixed cost and a single tip, every seed ran exactly the same length and
 * the blob ended up suspiciously round.
 */
function grow(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  const budget = grid.data[index]
  if (budget === 0 || !rng.chance(GROWTH_CHANCE)) return

  const target = pickShoot(grid, rng, x, y)
  if (target < 0) return

  transformCell(grid, target, MaterialId.plant)

  const cost = 1 + Math.floor(rng.next() * MAX_STEP_COST)
  const remaining = Math.max(0, budget - cost)

  if (rng.chance(BRANCH_CHANCE)) {
    grid.data[target] = Math.ceil(remaining / 2)
    grid.data[index] = Math.floor(remaining / 2)
    return
  }
  grid.data[target] = remaining
  grid.data[index] = 0
}

/** Chance per tick that a vine cell reaches into touching water. Slower than a plant: it never stops. */
const CREEP_CHANCE = 0.12
/**
 * Most vine a new cell may already be touching, not counting the cell that grew it. Endless growth with
 * no crowding rule just fills a pool solid; refusing to thicken is what keeps it a tangle with holes.
 */
const CROWD_LIMIT = 1

/** Diagonals included, because crowding is about how boxed-in a cell looks, not how it moves. */
const AROUND: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

/**
 * Vine creeps into water forever — no budget, unlike a plant. What stops it becoming a solid green mass
 * is the crowding rule, which is applied to the cell being grown into and counts every vine around it
 * except the one doing the growing. So a tip extends freely, a cell that would close a gap is refused,
 * and the vine spreads as thin, wandering filaments.
 *
 * The test applies to the target only. Testing the grower as well looked right in a test seeded with a
 * single cell and was useless in the game: a brush stroke paints a disc of vine whose every cell is
 * already surrounded by vine, so nothing in it could ever grow and painted vine did nothing at all.
 */
function creep(grid: Grid, rng: Rng, x: number, y: number): void {
  if (!rng.chance(CREEP_CHANCE)) return

  const target = pickShoot(grid, rng, x, y)
  if (target < 0) return

  const tx = target % grid.width
  const ty = (target - tx) / grid.width
  if (crowded(grid, tx, ty, cellIndex(grid, x, y))) return

  transformCell(grid, target, MaterialId.vine)
}

function crowded(grid: Grid, x: number, y: number, ignore: number): boolean {
  let neighbours = 0

  for (const [dx, dy] of AROUND) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (index === ignore || grid.material[index] !== MaterialId.vine) continue

    neighbours++
    if (neighbours > CROWD_LIMIT) return true
  }
  return false
}

/** A weighted-random direction into water, or -1 when the cell has none to grow into. */
function pickShoot(grid: Grid, rng: Rng, x: number, y: number): number {
  const start = Math.floor(rng.next() * SHOOT_BIAS.length)

  for (let step = 0; step < SHOOT_BIAS.length; step++) {
    const [dx, dy] = SHOOT_BIAS[(start + step) % SHOOT_BIAS.length]
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (grid.material[index] === MaterialId.water) return index
  }
  return -1
}

/**
 * Ice creeps into the water it touches, then rests. The cooldown lives in the cell's `data`, which ice
 * has no other use for.
 */
function frost(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (grid.data[index] > 0) {
    grid.data[index] -= 1
    return
  }
  if (!rng.chance(FROST_ON_CONTACT)) return

  const target = pickNeighbour(
    grid,
    x,
    y,
    (id) => id === MaterialId.water,
    Math.floor(rng.next() * NEIGHBOURS.length)
  )
  if (target < 0) return

  // Placed rather than transformed, so the new ice starts at ice temperature. Inheriting the water's
  // warmth would put it straight back over its own melting point.
  placeMaterial(grid, target, MaterialId.ice)
  grid.data[index] = restTicks(rng)
  grid.data[target] = restTicks(rng)
}

function restTicks(rng: Rng): number {
  return FROST_REST_MIN + Math.floor(rng.next() * FROST_REST_SPREAD)
}

/** First neighbour matching `accepts`, scanning NEIGHBOURS from `startAt`, or -1. */
function pickNeighbour(
  grid: Grid,
  x: number,
  y: number,
  accepts: (material: number) => boolean,
  startAt = 0
): number {
  for (let step = 0; step < NEIGHBOURS.length; step++) {
    const [dx, dy] = NEIGHBOURS[(startAt + step) % NEIGHBOURS.length]
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (accepts(grid.material[index])) return index
  }
  return -1
}
