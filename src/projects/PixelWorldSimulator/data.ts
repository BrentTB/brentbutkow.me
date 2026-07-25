import { MaterialId } from './pixel-world.types'

export const GRID_WIDTH = 300
export const GRID_HEIGHT = 200

export const TICK_RATE = 60

/** Room temperature in °C — where fresh cells start and where every cell slowly drifts back to. */
export const AMBIENT_TEMPERATURE = 20

/**
 * Ticks a single frame may run at 1× speed. It caps catch-up so a backgrounded tab can't come back and
 * simulate a whole second at once, and it stays small because a late frame that fires a burst of ticks
 * reads as a stutter. Speed multiplies it.
 */
export const MAX_TICKS_PER_FRAME = 2

/**
 * How fast the world runs. Slow motion is how you actually watch a reaction happen.
 *
 * The top speed is 2×, not 4×: drawing is capped at the display's refresh rate, so every extra tick per
 * frame is movement you never see happening. At 4× a flame jumped four cells between frames, which reads
 * as stutter rather than speed.
 */
export const SIM_SPEEDS: readonly { label: string; rate: number }[] = [
  { label: '0.25×', rate: 0.25 },
  { label: '0.5×', rate: 0.5 },
  { label: '1×', rate: 1 },
  { label: '2×', rate: 2 },
]
export const DEFAULT_SPEED = 1

/** How often the hovered cell's reading refreshes, in ms. Fast enough to watch a temperature move. */
export const READING_INTERVAL = 100

export const BRUSH_RADIUS = {
  min: 0,
  max: 24,
  default: 5,
}

export const MaterialGroup = {
  solids: 'solids',
  powders: 'powders',
  liquids: 'liquids',
  gases: 'gases',
  energy: 'energy',
} as const
export type MaterialGroup = (typeof MaterialGroup)[keyof typeof MaterialGroup]

/**
 * The palette in groups, because a single row of thirty-odd swatches is a wall rather than a choice.
 * Order inside each group runs from the everyday to the exotic. Erase sits outside the groups: it is a
 * tool, not a material, and it should never be a tab away.
 */
export const MATERIAL_GROUPS: readonly {
  group: MaterialGroup
  label: string
  materials: readonly MaterialId[]
}[] = [
  {
    group: MaterialGroup.solids,
    label: 'Solids',
    materials: [
      MaterialId.stone,
      MaterialId.wood,
      MaterialId.glass,
      MaterialId.metal,
      MaterialId.rubber,
      MaterialId.ice,
      MaterialId.plant,
      MaterialId.vine,
      MaterialId.sponge,
    ],
  },
  {
    group: MaterialGroup.powders,
    label: 'Powders',
    materials: [
      MaterialId.sand,
      MaterialId.dirt,
      MaterialId.gravel,
      MaterialId.ash,
      MaterialId.snow,
      MaterialId.salt,
      MaterialId.seed,
    ],
  },
  {
    group: MaterialGroup.liquids,
    label: 'Liquids',
    materials: [
      MaterialId.water,
      MaterialId.saltWater,
      MaterialId.oil,
      MaterialId.honey,
      MaterialId.mud,
      MaterialId.acid,
      MaterialId.lava,
      MaterialId.nitrogen,
    ],
  },
  {
    group: MaterialGroup.gases,
    label: 'Gases',
    materials: [
      MaterialId.steam,
      MaterialId.smoke,
      MaterialId.methane,
      MaterialId.chlorine,
      MaterialId.ember,
    ],
  },
  {
    group: MaterialGroup.energy,
    label: 'Energy',
    materials: [MaterialId.fire, MaterialId.spark, MaterialId.void, MaterialId.source],
  },
]

/** The material a fresh page starts on. */
export const DEFAULT_MATERIAL: MaterialId = MaterialId.sand

export const simCopy = {
  tagline: 'Draw materials into a pixel world and watch them react.',
  taglineFun: 'Draw materials, mix them, and see what happens to the little world you just made.',
  hint: 'Pick a material and draw. Point at anything to see what it is.',
  /** A source that has not been fed yet has nothing to copy. */
  sourceEmpty: 'nothing yet',
  searchPlaceholder: 'Find a material',
  noMatch: 'Nothing by that name.',
}
