import { Grid, MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'
import { cellIndex, placeMaterial, transformCell } from './grid'
import { isCellAwake, isRowBandAwake, wakeChunk } from './chunks'
import { Rng } from './rng'

/** Chance per tick that a burning cell throws a flame into a neighbouring cell of air. */
const FLAME_CHANCE = 0.16
/** Chance per tick that a burning cell puts a puff of smoke into the air above it. */
const SMOKE_CHANCE = 0.03

/** Where a flame or a puff can go, upward first — fire climbs. */
const VENTS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
]

/**
 * Counts down the two per-cell clocks: how long a cell stays alight, and how long a gas lasts before
 * it condenses or fades. Burning cells also throw flames and smoke into the air around them, which is
 * what makes a burning plank look alight rather than just recoloured.
 */
export function advanceTimers(grid: Grid, rng: Rng): void {
  const { width, height, material, data, burn } = grid

  for (let y = 0; y < height; y++) {
    if (!isRowBandAwake(grid, y)) continue
    for (let x = 0; x < width; x++) {
      if (!isCellAwake(grid, x, y)) continue
      const index = y * width + x
      const id = material[index]
      if (id === MaterialId.empty) continue

      const cell = MATERIALS[id]

      if (burn[index] > 0 && cell.ignite !== undefined) {
        burn[index] -= 1
        // A clock counting down has to keep its own chunk awake, or it stops at whatever it had left.
        wakeChunk(grid, index)
        if (burn[index] === 0) {
          transformCell(grid, index, cell.ignite.into)
          continue
        }
        if (rng.chance(FLAME_CHANCE)) vent(grid, rng, x, y, MaterialId.fire)
        else if (rng.chance(SMOKE_CHANCE)) vent(grid, rng, x, y, MaterialId.smoke)
        continue
      }

      if (cell.lifetime !== undefined && cell.expiresInto !== undefined && data[index] > 0) {
        data[index] -= 1
        wakeChunk(grid, index)
        if (data[index] === 0) transformCell(grid, index, cell.expiresInto)
      }
    }
  }
}

/** Puts `material` into the first free vent around a burning cell, starting from a random one. */
function vent(grid: Grid, rng: Rng, x: number, y: number, material: MaterialId): void {
  const start = Math.floor(rng.next() * VENTS.length)

  for (let step = 0; step < VENTS.length; step++) {
    const [dx, dy] = VENTS[(start + step) % VENTS.length]
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (grid.material[index] !== MaterialId.empty) continue

    placeMaterial(grid, index, material)
    return
  }
}
