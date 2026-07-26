import { Grid } from '../pixel-world.types'
import { cellIndex } from './grid'

/** The four neighbour offsets. Held still: built inline they were a fresh array per cell per tick. */
export const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
]

/** Default second predicate: held still so the common no-extra-condition call allocates no closure. */
const ACCEPT_ANY = (): boolean => true

/**
 * The first neighbour whose material `accepts`, starting the scan at `startAt` so callers can rotate it
 * with the rng — a fixed start biases everything that grows or spreads toward one direction. Returns -1
 * when nothing around this cell qualifies.
 */
export function pickNeighbour(
  grid: Grid,
  x: number,
  y: number,
  accepts: (material: number) => boolean,
  startAt = 0,
  alsoAccepts: (index: number) => boolean = ACCEPT_ANY
): number {
  for (let step = 0; step < NEIGHBOURS.length; step++) {
    const [dx, dy] = NEIGHBOURS[(startAt + step) % NEIGHBOURS.length]
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (accepts(grid.material[index]) && alsoAccepts(index)) return index
  }
  return -1
}
