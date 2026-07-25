import { Material, MaterialBehavior, MaterialId } from '../pixel-world.types'

/**
 * How solid a material reads to the brush. You can paint something more solid over something looser
 * (stone over water), never the reverse: water poured beside a wall flows around it instead of
 * eating it. Rank 1 is left for gases, which everything should be able to paint through.
 */
const PAINT_RANK: Record<MaterialBehavior, number> = {
  [MaterialBehavior.empty]: 0,
  [MaterialBehavior.liquid]: 2,
  [MaterialBehavior.powder]: 3,
  [MaterialBehavior.static]: 4,
}

export function canPaintOver(brush: MaterialId, existing: number): boolean {
  // Erase clears anything, and anything can be drawn into open air.
  if (brush === MaterialId.empty || existing === MaterialId.empty) return true
  return PAINT_RANK[MATERIALS[brush].behavior] > PAINT_RANK[MATERIALS[existing].behavior]
}

/**
 * Indexed by `MaterialId` — the sim reads it once per cell per tick, so it stays a flat array.
 * Densities are relative only: they decide who sinks through whom.
 */
export const MATERIALS: readonly Material[] = [
  {
    id: MaterialId.empty,
    // Air is what the brush leaves behind, so the palette calls it what it does.
    label: 'Erase',
    behavior: MaterialBehavior.empty,
    density: 0,
    color: [11, 12, 15],
    jitter: 0,
    dispersion: 0,
    drag: 0,
  },
  {
    id: MaterialId.stone,
    label: 'Stone',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [122, 124, 130],
    jitter: 10,
    dispersion: 0,
    drag: 0,
  },
  {
    id: MaterialId.sand,
    label: 'Sand',
    behavior: MaterialBehavior.powder,
    density: 60,
    color: [214, 172, 96],
    jitter: 18,
    dispersion: 0,
    drag: 0,
  },
  {
    id: MaterialId.water,
    label: 'Water',
    behavior: MaterialBehavior.liquid,
    density: 50,
    color: [62, 122, 186],
    jitter: 12,
    dispersion: 5,
    drag: 0.65,
  },
]
