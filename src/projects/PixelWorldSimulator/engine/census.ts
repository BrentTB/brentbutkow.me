import { Grid } from '../pixel-world.types'
import { MATERIALS } from './materials'

/**
 * How many cells of each material the world holds, indexed by `MaterialId`. One pass over the grid, into a
 * caller-owned array so a running tally costs no allocation — the panel that shows this refreshes several
 * times a second and a fresh array each time would be garbage for nothing.
 */
export function countMaterials(grid: Grid, into?: Uint32Array): Uint32Array {
  const counts = into ?? new Uint32Array(MATERIALS.length)
  counts.fill(0)
  for (const material of grid.material) counts[material]++
  return counts
}
