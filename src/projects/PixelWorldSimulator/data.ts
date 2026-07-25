import { MaterialId } from './pixel-world.types'

export const GRID_WIDTH = 300
export const GRID_HEIGHT = 200

export const TICK_RATE = 60

/** Room temperature in °C — where fresh cells start and where every cell slowly drifts back to. */
export const AMBIENT_TEMPERATURE = 20

/** Cap on catch-up work per frame — a backgrounded tab shouldn't return and simulate a whole second. */
export const MAX_TICKS_PER_FRAME = 4

export const BRUSH_RADIUS = {
  min: 0,
  max: 24,
  default: 5,
}

/**
 * Palette order, left to right: the everyday materials first, then the ones that react, then the
 * hot ones. Erase sits last, where a tool goes rather than a material.
 */
export const PAINTABLE_MATERIALS: readonly MaterialId[] = [
  MaterialId.sand,
  MaterialId.water,
  MaterialId.stone,
  MaterialId.dirt,
  MaterialId.wood,
  MaterialId.plant,
  MaterialId.vine,
  MaterialId.ice,
  MaterialId.glass,
  MaterialId.oil,
  MaterialId.acid,
  MaterialId.methane,
  MaterialId.ash,
  MaterialId.steam,
  MaterialId.lava,
  MaterialId.fire,
  MaterialId.empty,
]

export const simCopy = {
  tagline: 'Draw materials into a pixel world and watch them react.',
  taglineFun: 'Draw materials, mix them, and see what happens to the little world you just made.',
  hint: 'Pick a material and draw on the canvas.',
}
