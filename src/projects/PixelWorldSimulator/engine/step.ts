import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { cellIndex } from './grid'
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
  if (material.behavior === MaterialBehavior.powder) {
    if (sinkingStalled(grid, rng, x, y, material.density)) return
    fall(grid, rng, x, y, from)
    return
  }
  if (material.behavior === MaterialBehavior.liquid) {
    if (sinkingStalled(grid, rng, x, y, material.density)) return
    if (fall(grid, rng, x, y, from)) return
    const dir = rng.chance(0.5) ? 1 : -1
    if (flow(grid, x, y, from, dir, material.dispersion)) return
    flow(grid, x, y, from, -dir, material.dispersion)
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
  if (tryMove(grid, from, x, y + 1)) return true
  const dir = rng.chance(0.5) ? 1 : -1
  return tryMove(grid, from, x + dir, y + 1) || tryMove(grid, from, x - dir, y + 1)
}

/** Slides as far as `dispersion` cells sideways, stopping at the first cell it can't enter. */
function flow(
  grid: Grid,
  x: number,
  y: number,
  from: number,
  dir: number,
  dispersion: number
): boolean {
  let target = -1
  for (let distance = 1; distance <= dispersion; distance++) {
    const nx = x + dir * distance
    if (!canMoveTo(grid, from, nx, y)) break
    target = nx
  }
  return target >= 0 && tryMove(grid, from, target, y)
}

function canMoveTo(grid: Grid, from: number, x: number, y: number): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return false
  return canDisplace(grid.material[from], grid.material[cellIndex(grid, x, y)])
}

/** Air yields to anything; static materials yield to nothing; otherwise the denser cell wins. */
function canDisplace(source: number, target: number): boolean {
  if (target === MaterialId.empty) return true
  const blocker = MATERIALS[target]
  if (blocker.behavior === MaterialBehavior.static) return false
  return blocker.density < MATERIALS[source].density
}

function tryMove(grid: Grid, from: number, x: number, y: number): boolean {
  if (!canMoveTo(grid, from, x, y)) return false

  const to = cellIndex(grid, x, y)
  const displaced = grid.material[to]
  grid.material[to] = grid.material[from]
  grid.material[from] = displaced
  grid.moved[to] = 1
  grid.moved[from] = 1
  return true
}
