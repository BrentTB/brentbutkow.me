export const MaterialId = {
  empty: 0,
  stone: 1,
  sand: 2,
  dirt: 3,
  ash: 4,
  wood: 5,
  plant: 6,
  ice: 7,
  glass: 8,
  oil: 9,
  acid: 10,
  lava: 11,
  water: 12,
  steam: 13,
  smoke: 14,
  methane: 15,
  fire: 16,
} as const
export type MaterialId = (typeof MaterialId)[keyof typeof MaterialId]

export const MaterialBehavior = {
  empty: 'empty',
  static: 'static',
  powder: 'powder',
  liquid: 'liquid',
  gas: 'gas',
} as const
export type MaterialBehavior = (typeof MaterialBehavior)[keyof typeof MaterialBehavior]

/** A threshold that turns one material into another. */
type MaterialTransition = {
  /** Temperature in °C. */
  at: number
  into: MaterialId
}

export type Material = {
  id: MaterialId
  /** Shown on the palette swatch. */
  label: string
  behavior: MaterialBehavior
  /** Denser materials displace lighter ones; static materials are never displaced. */
  density: number
  color: readonly [number, number, number]
  /** Per-cell brightness spread, in 0–255 units, so a flat fill doesn't read as a solid rectangle. */
  jitter: number
  /** Liquids and gases: how many cells one tick can spread sideways when blocked. Viscosity, inverted. */
  dispersion: number
  /**
   * Chance in [0, 1) that this material stalls something trying to sink through it for a tick, so
   * sand drifts down through water instead of dropping at its dry speed. Only fluids need it.
   */
  drag: number
  /** Share of the neighbour temperature gradient this material passes on each tick, 0–1. */
  conductivity: number
  /** Temperature a freshly placed cell starts at. Ambient when omitted. */
  startTemperature?: number
  /** Cells drive their own temperature toward this, so lava stays molten and fire stays hot. */
  selfHeat?: number
  /** Becomes `into` above `at` °C. */
  hot?: MaterialTransition
  /** Becomes `into` below `at` °C. */
  cold?: MaterialTransition
  /** Catches fire above `at` °C, burns for `ticks` radiating `heat`, and leaves `into` behind. */
  ignite?: {
    at: number
    ticks: number
    heat: number
    into: MaterialId
  }
  /** Ticks a spawned cell survives before turning into `expiresInto`. Gases and flames. */
  lifetime?: number
  expiresInto?: MaterialId
  /** Generic per-cell budget held in `data`: acid dissolves left, plant growth steps left. */
  uses?: number
  /** Acid leaves this material alone. */
  acidProof?: boolean
  /** Flames stay on their fuel instead of drifting up off it while anything nearby can still burn. */
  clingsToFuel?: boolean
  /** Gets the glow pass in the renderer. */
  emissive?: boolean
}

/** Cells live in flat typed arrays indexed `y * width + x`. */
export type Grid = {
  width: number
  height: number
  material: Uint8Array
  /** Set for cells already stepped this tick, so a displaced cell can't move twice. */
  moved: Uint8Array
  /** Per-cell counter: gas lifetime left, acid charges left, plant growth steps left. */
  data: Uint8Array
  /** Ticks of burning left in this cell. Separate from `data` so a plant can be alight and still grow. */
  burn: Uint8Array
  /** °C per cell. */
  temperature: Int16Array
  /** Diffusion writes here and the two swap, so heat spreads evenly instead of down-and-right. */
  temperatureNext: Int16Array
  /**
   * One flag per row: does this row hold anything but room temperature? The heat pass skips the rest,
   * which is what keeps an idle world cheap. Marking is conservative — a marked row's neighbours are
   * marked too, so heat can never leak into a sleeping row unnoticed.
   */
  hotRows: Uint8Array
  hotRowsNext: Uint8Array
}

export type CellPoint = {
  x: number
  y: number
}
