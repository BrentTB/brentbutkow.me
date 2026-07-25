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
  hint: 'Pick a material and draw on the canvas.',
  identifyHint: 'Click anything to see what it is.',
  searchPlaceholder: 'Find a material',
  noMatch: 'Nothing by that name.',
}
