import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { cellIndex, markHotRow } from './grid'
import { MATERIALS } from './materials'
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

  const material = MATERIALS[id]

  if (material.behavior === MaterialBehavior.gas) {
    // A flame that drifts off its fuel never lights it: it only touches the plank for one tick.
    if (material.clingsToFuel === true && touchesFuel(grid, x, y)) return
    if (rise(grid, rng, x, y, from)) return
    spread(grid, rng, x, y, from, material.dispersion, true)
    return
  }

  if (material.behavior === MaterialBehavior.powder) {
    if (sinkingStalled(grid, rng, x, y, material.density)) return
    fall(grid, rng, x, y, from)
    return
  }

  if (material.behavior === MaterialBehavior.liquid) {
    if (sinkingStalled(grid, rng, x, y, material.density)) return
    if (fall(grid, rng, x, y, from)) return
    spread(grid, rng, x, y, from, material.dispersion, false)
  }
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

/** Straight down, then the two diagonals in a random order — the pile-forming rule. */
function fall(grid: Grid, rng: Rng, x: number, y: number, from: number): boolean {
  if (tryMove(grid, from, x, y + 1, false)) return true
  const dir = rng.chance(0.5) ? 1 : -1
  return tryMove(grid, from, x + dir, y + 1, false) || tryMove(grid, from, x - dir, y + 1, false)
}

/** True when any of the four neighbours is something that can catch fire. */
function touchesFuel(grid: Grid, x: number, y: number): boolean {
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
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

/** Air yields to anything; static materials yield to nothing; otherwise the denser cell wins. */
function canDisplace(source: number, target: number): boolean {
  if (target === MaterialId.empty) return true
  const blocker = MATERIALS[target]
  if (blocker.behavior === MaterialBehavior.static) return false
  return blocker.density < MATERIALS[source].density
}

/** Buoyancy runs the comparison the other way, so a bubble climbs through water. */
function canFloatThrough(source: number, target: number): boolean {
  if (target === MaterialId.empty) return true
  const blocker = MATERIALS[target]
  if (blocker.behavior === MaterialBehavior.static) return false
  return blocker.density > MATERIALS[source].density
}

function tryMove(grid: Grid, from: number, x: number, y: number, buoyant: boolean): boolean {
  if (!canMoveTo(grid, from, x, y, buoyant)) return false

  const to = cellIndex(grid, x, y)
  swapCells(grid, from, to)
  grid.moved[to] = 1
  grid.moved[from] = 1
  return true
}

/** A cell's counters and its heat travel with its material — lava carries its own temperature. */
function swapCells(grid: Grid, a: number, b: number): void {
  const material = grid.material[b]
  const data = grid.data[b]
  const burn = grid.burn[b]
  const temperature = grid.temperature[b]

  // Heat that moves between rows has to wake them, or the heat pass would skip the row it landed in.
  if (
    temperature !== AMBIENT_TEMPERATURE ||
    grid.temperature[a] !== AMBIENT_TEMPERATURE ||
    burn > 0 ||
    grid.burn[a] > 0
  ) {
    markHotRow(grid, a)
    markHotRow(grid, b)
  }

  grid.material[b] = grid.material[a]
  grid.data[b] = grid.data[a]
  grid.burn[b] = grid.burn[a]
  grid.temperature[b] = grid.temperature[a]

  grid.material[a] = material
  grid.data[a] = data
  grid.burn[a] = burn
  grid.temperature[a] = temperature
}
