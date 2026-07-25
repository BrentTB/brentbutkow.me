import { Grid, MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'
import { cellIndex, transformCell } from './grid'
import { Rng } from './rng'

/** Chance per tick that a drop of acid eats one of its neighbours. */
const DISSOLVE_CHANCE = 0.14
/** Chance per tick that a plant cell turns adjacent water into more plant. */
const GROWTH_CHANCE = 0.03

/** Neighbour offsets, up first — plants prefer to grow toward the surface. */
const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, 0],
  [1, 0],
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
    }
  }
}

function dissolve(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (!rng.chance(DISSOLVE_CHANCE)) return

  // Rotate where the scan starts, or acid would always eat upward first.
  const target = pickNeighbour(
    grid,
    x,
    y,
    (id) => {
      if (id === MaterialId.empty || id === MaterialId.acid) return false
      return !MATERIALS[id].acidProof
    },
    Math.floor(rng.next() * NEIGHBOURS.length)
  )
  if (target < 0) return

  transformCell(grid, target, MaterialId.empty)
  grid.data[index] -= 1
  if (grid.data[index] === 0) transformCell(grid, index, MaterialId.empty)
}

/**
 * A plant spends one growth step to convert adjacent water, then splits what's left of its budget
 * with the shoot it just made. Splitting rather than copying is what bounds the whole vine: every
 * growth costs the pair one step, so one painted cell can only ever become `uses + 1` of them.
 */
function grow(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (grid.data[index] === 0 || !rng.chance(GROWTH_CHANCE)) return

  const target = pickNeighbour(grid, x, y, (id) => id === MaterialId.water)
  if (target < 0) return

  transformCell(grid, target, MaterialId.plant)
  const remaining = grid.data[index] - 1
  grid.data[index] = Math.ceil(remaining / 2)
  grid.data[target] = Math.floor(remaining / 2)
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
