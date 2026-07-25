export const MaterialId = {
  empty: 0,
  stone: 1,
  sand: 2,
  water: 3,
} as const
export type MaterialId = (typeof MaterialId)[keyof typeof MaterialId]

export const MaterialBehavior = {
  empty: 'empty',
  static: 'static',
  powder: 'powder',
  liquid: 'liquid',
} as const
export type MaterialBehavior = (typeof MaterialBehavior)[keyof typeof MaterialBehavior]

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
  /** Liquids: how many cells one tick can spread sideways when blocked below. Viscosity, inverted. */
  dispersion: number
}

/** Cells live in flat typed arrays indexed `y * width + x`. */
export type Grid = {
  width: number
  height: number
  material: Uint8Array
  /** Set for cells already stepped this tick, so a displaced cell can't move twice. */
  moved: Uint8Array
}

export type CellPoint = {
  x: number
  y: number
}
