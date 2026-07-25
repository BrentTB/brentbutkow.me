import { Grid, MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'
import { cellIndex, placeMaterial, transformCell } from './grid'
import { Rng } from './rng'

/** Chance per tick that a burning cell puts a puff of smoke into the air above it. */
const SMOKE_CHANCE = 0.05

/**
 * Counts down the two per-cell clocks: how long a cell stays alight, and how long a gas lasts before
 * it condenses or fades. Burning cells also breathe smoke upward while they last.
 */
export function advanceTimers(grid: Grid, rng: Rng): void {
  const { width, height, material, data, burn } = grid

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const id = material[index]
      if (id === MaterialId.empty) continue

      const cell = MATERIALS[id]

      if (burn[index] > 0 && cell.ignite !== undefined) {
        burn[index] -= 1
        if (burn[index] === 0) {
          transformCell(grid, index, cell.ignite.into)
          continue
        }
        emitSmoke(grid, rng, x, y)
        continue
      }

      if (cell.lifetime !== undefined && cell.expiresInto !== undefined && data[index] > 0) {
        data[index] -= 1
        if (data[index] === 0) transformCell(grid, index, cell.expiresInto)
      }
    }
  }
}

function emitSmoke(grid: Grid, rng: Rng, x: number, y: number): void {
  if (y === 0 || !rng.chance(SMOKE_CHANCE)) return

  const above = cellIndex(grid, x, y - 1)
  if (grid.material[above] === MaterialId.empty) placeMaterial(grid, above, MaterialId.smoke)
}
