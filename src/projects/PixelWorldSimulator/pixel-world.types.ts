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
  vine: 17,
  salt: 18,
  saltWater: 19,
  snow: 20,
  gravel: 21,
  seed: 22,
  honey: 23,
  mud: 24,
  nitrogen: 25,
  sponge: 26,
  metal: 27,
  rubber: 28,
  spark: 29,
  ember: 30,
  void: 31,
  source: 32,
  chlorine: 33,
  tnt: 34,
  gunpowder: 35,
  shard: 36,
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
  /** One line on the swatch's tooltip: what this is, or the one behaviour worth knowing about it. */
  blurb: string
  behavior: MaterialBehavior
  /** Denser materials displace lighter ones; static materials are never displaced. */
  density: number
  color: readonly [number, number, number]
  /** Per-cell brightness spread, in 0–255 units, so a flat fill doesn't read as a solid rectangle. */
  jitter: number
  /** Liquids and gases: how many cells one tick can spread sideways when blocked. Viscosity, inverted. */
  dispersion: number
  /**
   * Powders: this grain only rolls off a real drop, not down the shoulder of its own heap, which holds a
   * steep cone instead of spreading flat like sand. A per-tick slide chance can't do this job — a grain
   * sitting on a slope gets a fresh roll every tick, so it always slides eventually.
   */
  steep?: boolean
  /** Gases heavier than air, which sink and pool instead of rising. */
  sinks?: boolean
  /**
   * Chance in [0, 1) that this material stalls something trying to sink through it for a tick, so
   * sand drifts down through water instead of dropping at its dry speed, and water seeps into a heap
   * of ash instead of plunging straight through it.
   */
  drag: number
  /** Share of the neighbour temperature gradient this material passes on each tick, 0–1. */
  conductivity: number
  /** Temperature a freshly placed cell starts at. Ambient when omitted. */
  startTemperature?: number
  /**
   * Cells hold their own temperature here, warming or cooling toward it: lava stays molten, fire
   * stays hot, and ice stays frozen at room temperature instead of melting the moment you place it.
   */
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
  /** Acid leaves this material alone — the container you build to hold acid. */
  acidProof?: boolean
  /** Multiplier on how readily acid eats this, 0–1. Stone is slow; most things are 1 (omitted). */
  acidResistance?: number
  /** A spark travels through this. */
  conductive?: boolean
  /** Cells of liquid this can soak up before it is full. */
  absorbs?: number
  /** Flames stay on their fuel instead of drifting up off it while anything nearby can still burn. */
  clingsToFuel?: boolean
  /** Gets the glow pass in the renderer. */
  emissive?: boolean
  /**
   * Share of its speed a thrown cell keeps when it bounces, 0–1. Most things thud and stay put; rubber
   * is the one material with a real bounce in it.
   */
  restitution?: number
  /** Detonates at `at` °C: an outward impulse over `radius` cells, a heat pulse, and `into` left behind. */
  explodes?: {
    at: number
    radius: number
    /** Speed in cells per tick handed to a cell at the centre; it falls off to nothing at the rim. */
    impulse: number
    /** °C written across the blast, which is what chains one charge into the next. */
    heat: number
    into: MaterialId
  }
  /** Breaks into this when something fast enough hits it. */
  shatters?: MaterialId
}

/**
 * A cell in flight, in cells per tick. `ox`/`oy` carry the sub-cell remainder between ticks, so a cell
 * drifting at a third of a cell per tick still moves every third tick instead of rounding to nothing.
 */
export type Velocity = {
  vx: number
  vy: number
  ox: number
  oy: number
}

/** What the pointer does to the world. Paint is the material brush; the rest write forces or heat. */
export const Tool = {
  paint: 'paint',
  attract: 'attract',
  blast: 'blast',
  wind: 'wind',
  heat: 'heat',
  chill: 'chill',
} as const
export type Tool = (typeof Tool)[keyof typeof Tool]

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
  /**
   * Cells currently in flight, keyed by index. Sparse because almost nothing is flying almost all of the
   * time: an explosion fills it for a second and it empties itself as the debris settles.
   */
  velocity: Map<number, Velocity>
}

/** What is in the cell under the pointer. */
export type CellReading = {
  material: MaterialId
  /** °C. */
  temperature: number
  burning: boolean
  /** For a source: the material it has been fed and now produces, if any. */
  producing?: MaterialId
}

export type CellPoint = {
  x: number
  y: number
}
