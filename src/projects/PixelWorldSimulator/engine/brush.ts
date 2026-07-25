import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, inBounds, markHotRow, placeMaterial, refreshCell } from './grid'
import { MATERIALS, canPaintOver } from './materials'

/** Paints a filled circle of `material`, clipped to the grid and to the paint hierarchy. */
export function stampCircle(
  grid: Grid,
  cx: number,
  cy: number,
  radius: number,
  material: MaterialId
): void {
  const reach = Math.max(0, Math.floor(radius))
  const limit = (reach + 0.5) * (reach + 0.5)

  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if (dx * dx + dy * dy > limit) continue
      const x = cx + dx
      const y = cy + dy
      if (!inBounds(grid, x, y)) continue

      const cell = cellIndex(grid, x, y)
      if (light(grid, cell, material)) continue
      // Drawing over your own trail restarts its clock instead of doing nothing, which is what a
      // second loop of spark needs: the hierarchy blocks a material from painting over itself.
      if (grid.material[cell] === material) refreshCell(grid, cell, material)
      else if (canPaintOver(material, grid.material[cell])) placeMaterial(grid, cell, material)
    }
  }
}

/**
 * Degrees above its own threshold a charge is lit to. Landing exactly on the threshold is not enough:
 * diffusion runs before the threshold is tested, so it shaves a few degrees off first and the charge
 * sits there glowing instead of going off.
 */
const LIT_OVERSHOOT = 30

/**
 * The fire brush is a match, not a material: dragging it across a plank sets the plank alight
 * instead of bouncing off the paint hierarchy, which would leave flames unable to touch anything
 * solid enough to burn. A charge is touched off the same way, by heating it to the point it goes off:
 * a match you cannot light dynamite with is a strange match.
 */
function light(grid: Grid, cell: number, brush: MaterialId): boolean {
  if (brush !== MaterialId.fire) return false

  const { ignite, explodes } = MATERIALS[grid.material[cell]]

  if (explodes !== undefined) {
    grid.temperature[cell] = explodes.at + LIT_OVERSHOOT
    markHotRow(grid, cell)
    return true
  }

  if (ignite === undefined) return false

  // Already alight stays alight on its own clock, the same rule the heat pass uses. Restamping was
  // refreshing the countdown, so wood under a held brush never burned down to ash.
  if (grid.burn[cell] === 0) {
    grid.burn[cell] = ignite.ticks
    markHotRow(grid, cell)
  }
  return true
}

/**
 * Paints circles along the segment between two pointer samples. Without this a fast drag lands as
 * a dotted line, since pointer events arrive far apart in grid cells.
 */
export function stampLine(
  grid: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  material: MaterialId
): void {
  const dx = x1 - x0
  const dy = y1 - y0
  const steps = Math.max(Math.abs(dx), Math.abs(dy))

  if (steps === 0) {
    stampCircle(grid, x0, y0, radius, material)
    return
  }

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    stampCircle(grid, Math.round(x0 + dx * t), Math.round(y0 + dy * t), radius, material)
  }
}
