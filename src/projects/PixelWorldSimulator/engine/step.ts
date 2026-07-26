import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { cellIndex, swapCells } from './grid'
import { MATERIALS, canDisplace, canFloatThrough } from './materials'
import { isSupported, push } from './kinetic'
import { NEIGHBOURS } from './neighbours'
import { Rng } from './rng'

/**
 * Advances the world one tick, in place.
 *
 * Rows run bottom-up so a falling cell moves one row per tick instead of dropping a whole column,
 * and the x-direction alternates with tick parity — a fixed scan direction bends piles sideways in
 * a way that looks like wind.
 */
export function step(grid: Grid, rng: Rng, tick: number): void {
  grid.moved.fill(0)
  const leftToRight = tick % 2 === 0

  for (let y = grid.height - 1; y >= 0; y--) {
    for (let i = 0; i < grid.width; i++) {
      const x = leftToRight ? i : grid.width - 1 - i
      stepCell(grid, rng, x, y)
    }
  }
}

function stepCell(grid: Grid, rng: Rng, x: number, y: number): void {
  const from = cellIndex(grid, x, y)
  // Air is most of the world most of the time, so it gets checked before anything is looked up.
  const id = grid.material[from]
  if (id === MaterialId.empty || grid.moved[from]) return
  // A cell in flight belongs to the kinetic pass this tick; its own class would fight the arc.
  if (grid.velocity.size > 0 && grid.velocity.has(from)) return

  const material = MATERIALS[id]

  if (material.behavior === MaterialBehavior.gas) {
    // A flame that drifts off its fuel never lights it: it only touches the plank for one tick.
    if (material.clingsToFuel === true && touchesFuel(grid, x, y)) return

    if (material.sinks === true) {
      sinkAndDrift(grid, rng, x, y, from, material.dispersion)
      return
    }

    if (rise(grid, rng, x, y, from)) return
    spread(grid, rng, x, y, from, material.dispersion, true)
    return
  }

  if (material.behavior === MaterialBehavior.powder) {
    // Anything springy falls as a thrown cell rather than a grain, which is the only way it arrives at
    // the floor with a speed to bounce off it. Dropping one cell per tick has nothing to rebound with.
    if (material.restitution !== undefined && !isSupported(grid, from)) {
      push(grid, from, 0, 0)
      return
    }
    if (sinkingStalled(grid, rng, x, y, material.density)) return
    fall(grid, rng, x, y, from, material.steep === true)
    return
  }

  if (material.behavior === MaterialBehavior.liquid) {
    if (sinkingStalled(grid, rng, x, y, material.density)) return
    if (fall(grid, rng, x, y, from)) return
    spread(grid, rng, x, y, from, material.dispersion, false)
  }
}

/** How a heavy gas splits its tick: mostly downward, often sideways, sometimes back up. */
const HEAVY_GAS_SINK = 0.55
const HEAVY_GAS_DRIFT = 0.85

/**
 * A gas heavier than air hangs low, but it is still a gas. Falling every tick and then levelling made
 * chlorine read as a dense liquid with a flat surface: it has to keep drifting sideways and wandering
 * back upward, so the cloud has a ragged top and seeps along the ground instead of pooling.
 */
function sinkAndDrift(
  grid: Grid,
  rng: Rng,
  x: number,
  y: number,
  from: number,
  dispersion: number
): void {
  const roll = rng.next()

  if (roll < HEAVY_GAS_SINK) {
    if (fall(grid, rng, x, y, from)) return
  } else if (roll < HEAVY_GAS_DRIFT) {
    if (spread(grid, rng, x, y, from, dispersion, false)) return
  } else if (rise(grid, rng, x, y, from)) {
    return
  }

  spread(grid, rng, x, y, from, dispersion, false)
}

/**
 * Sinking through a fluid is slower than falling through air: a cell above something lighter than
 * itself loses this tick with that fluid's `drag` chance. Equal-density neighbours are the same
 * fluid, which shouldn't slow its own levelling.
 */
function sinkingStalled(grid: Grid, rng: Rng, x: number, y: number, density: number): boolean {
  if (y + 1 >= grid.height) return false
  const below = MATERIALS[grid.material[cellIndex(grid, x, y + 1)]]
  return below.drag > 0 && below.density < density && rng.chance(below.drag)
}

/**
 * Straight down, then the two diagonals in a random order — the pile-forming rule.
 *
 * A `steep` powder takes a diagonal only where the cell below that diagonal is open too, so it rolls
 * off a genuine drop but not down the shoulder of its own heap. That is what gives gravel a steeper
 * angle of repose than sand, and it has to be structural: a per-tick slide chance just delays the
 * spreading, because a grain on a slope gets a fresh roll every tick until it wins one.
 */
function fall(grid: Grid, rng: Rng, x: number, y: number, from: number, steep = false): boolean {
  if (tryMove(grid, from, x, y + 1, false)) return true

  const dir = rng.chance(0.5) ? 1 : -1
  return rollOff(grid, from, x, y, dir, steep) || rollOff(grid, from, x, y, -dir, steep)
}

function rollOff(
  grid: Grid,
  from: number,
  x: number,
  y: number,
  dir: number,
  steep: boolean
): boolean {
  if (steep && !canMoveTo(grid, from, x + dir, y + 2, false)) return false
  return tryMove(grid, from, x + dir, y + 1, false)
}

/** True when any of the four neighbours is something that can catch fire. Order does not matter here. */
function touchesFuel(grid: Grid, x: number, y: number): boolean {
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (MATERIALS[grid.material[cellIndex(grid, nx, ny)]].ignite !== undefined) return true
  }
  return false
}

/** The mirror of `fall` for gases: straight up, then a diagonal. */
function rise(grid: Grid, rng: Rng, x: number, y: number, from: number): boolean {
  if (tryMove(grid, from, x, y - 1, true)) return true
  const dir = rng.chance(0.5) ? 1 : -1
  return tryMove(grid, from, x + dir, y - 1, true) || tryMove(grid, from, x - dir, y - 1, true)
}

/** Slides sideways up to `dispersion` cells, stopping at the first cell it can't enter. */
function spread(
  grid: Grid,
  rng: Rng,
  x: number,
  y: number,
  from: number,
  dispersion: number,
  buoyant: boolean
): boolean {
  const dir = rng.chance(0.5) ? 1 : -1
  return (
    slide(grid, from, x, y, dir, dispersion, buoyant) ||
    slide(grid, from, x, y, -dir, dispersion, buoyant)
  )
}

function slide(
  grid: Grid,
  from: number,
  x: number,
  y: number,
  dir: number,
  dispersion: number,
  buoyant: boolean
): boolean {
  let target = -1
  for (let distance = 1; distance <= dispersion; distance++) {
    const nx = x + dir * distance
    if (!canMoveTo(grid, from, nx, y, buoyant)) break
    target = nx
  }
  return target >= 0 && tryMove(grid, from, target, y, buoyant)
}

function canMoveTo(grid: Grid, from: number, x: number, y: number, buoyant: boolean): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return false
  const source = grid.material[from]
  const target = grid.material[cellIndex(grid, x, y)]
  return buoyant ? canFloatThrough(source, target) : canDisplace(source, target)
}

function tryMove(grid: Grid, from: number, x: number, y: number, buoyant: boolean): boolean {
  if (!canMoveTo(grid, from, x, y, buoyant)) return false

  const to = cellIndex(grid, x, y)
  swapCells(grid, from, to)
  grid.moved[to] = 1
  grid.moved[from] = 1
  return true
}
