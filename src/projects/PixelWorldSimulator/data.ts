import { MaterialId } from './pixel-world.types'

export const GRID_WIDTH = 300
export const GRID_HEIGHT = 200

export const TICK_RATE = 60

/** Cap on catch-up work per frame — a backgrounded tab shouldn't return and simulate a whole second. */
export const MAX_TICKS_PER_FRAME = 4

export const BRUSH_RADIUS = {
  min: 0,
  max: 24,
  default: 5,
}

/** Palette order, left to right. Erase sits last, where a tool goes rather than a material. */
export const PAINTABLE_MATERIALS: readonly MaterialId[] = [
  MaterialId.sand,
  MaterialId.water,
  MaterialId.stone,
  MaterialId.empty,
]

export const simCopy = {
  tagline: 'Draw materials into a pixel world and watch them react.',
  taglineFun: 'Draw materials, mix them, and see what happens to the little world you just made.',
  hint: 'Pick a material and draw on the canvas.',
}
