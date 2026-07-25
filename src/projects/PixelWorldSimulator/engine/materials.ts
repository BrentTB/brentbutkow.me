import { Material, MaterialBehavior, MaterialId } from '../pixel-world.types'

/**
 * How solid a material reads to the brush. You can paint something more solid over something looser
 * (stone over water), never the reverse: water poured beside a wall flows around it instead of
 * eating it.
 */
const PAINT_RANK: Record<MaterialBehavior, number> = {
  [MaterialBehavior.empty]: 0,
  [MaterialBehavior.gas]: 1,
  [MaterialBehavior.liquid]: 2,
  [MaterialBehavior.powder]: 3,
  [MaterialBehavior.static]: 4,
}

export function canPaintOver(brush: MaterialId, existing: number): boolean {
  // Erase clears anything, and anything can be drawn into open air.
  if (brush === MaterialId.empty || existing === MaterialId.empty) return true
  // Gases are wisps: anything paints through them, including another gas. Otherwise a puff of smoke
  // would block the fire brush, and holding a flame in one spot would smother itself.
  if (MATERIALS[existing].behavior === MaterialBehavior.gas) return true
  return PAINT_RANK[MATERIALS[brush].behavior] > PAINT_RANK[MATERIALS[existing].behavior]
}

/** True while a cell is alight — it renders as flame and radiates until its timer runs out. */
export function isBurning(burn: number): boolean {
  return burn > 0
}

/**
 * Indexed by `MaterialId` — the sim reads it once per cell per tick, so it stays a flat array.
 * Densities are relative only: they decide who sinks through whom. Temperatures are °C.
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
    conductivity: 0.05,
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
    conductivity: 0.2,
    // Acid does eat stone, just slowly — glass is the container you build to hold it.
    acidResistance: 0.15,
  },
  {
    id: MaterialId.sand,
    label: 'Sand',
    behavior: MaterialBehavior.powder,
    density: 60,
    color: [214, 172, 96],
    jitter: 18,
    dispersion: 0,
    drag: 0.7,
    conductivity: 0.15,
    hot: { at: 1200, into: MaterialId.glass },
  },
  {
    id: MaterialId.dirt,
    label: 'Dirt',
    behavior: MaterialBehavior.powder,
    density: 65,
    color: [110, 78, 52],
    jitter: 12,
    dispersion: 0,
    drag: 0.75,
    conductivity: 0.12,
  },
  {
    id: MaterialId.ash,
    label: 'Ash',
    behavior: MaterialBehavior.powder,
    density: 40,
    color: [92, 88, 86],
    jitter: 14,
    dispersion: 0,
    drag: 0.6,
    conductivity: 0.1,
  },
  {
    id: MaterialId.wood,
    label: 'Wood',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [124, 84, 48],
    jitter: 16,
    dispersion: 0,
    drag: 0,
    conductivity: 0.08,
    ignite: { at: 250, ticks: 200, heat: 620, into: MaterialId.ash },
  },
  {
    id: MaterialId.plant,
    label: 'Plant',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [78, 148, 66],
    jitter: 16,
    dispersion: 0,
    drag: 0,
    conductivity: 0.1,
    // Dry leaves: catches at the lowest temperature of anything and flashes over in a moment.
    ignite: { at: 110, ticks: 14, heat: 540, into: MaterialId.ash },
    // Growth budget. Generous, because a vine that stops after five cells reads as broken.
    uses: 40,
  },
  {
    id: MaterialId.ice,
    label: 'Ice',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [176, 214, 232],
    jitter: 8,
    dispersion: 0,
    drag: 0,
    conductivity: 0.3,
    startTemperature: -25,
    // Ice keeps itself frozen, so a block survives room temperature and only melts against real heat.
    selfHeat: -32,
    hot: { at: 4, into: MaterialId.water },
  },
  {
    id: MaterialId.glass,
    label: 'Glass',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [150, 190, 196],
    jitter: 6,
    dispersion: 0,
    drag: 0,
    conductivity: 0.18,
    acidProof: true,
  },
  {
    id: MaterialId.oil,
    label: 'Oil',
    behavior: MaterialBehavior.liquid,
    density: 40,
    color: [86, 62, 40],
    jitter: 10,
    dispersion: 3,
    drag: 0.5,
    conductivity: 0.1,
    ignite: { at: 140, ticks: 70, heat: 700, into: MaterialId.empty },
  },
  {
    id: MaterialId.acid,
    label: 'Acid',
    behavior: MaterialBehavior.liquid,
    density: 45,
    color: [150, 214, 62],
    jitter: 12,
    dispersion: 4,
    drag: 0.55,
    conductivity: 0.12,
    uses: 12,
  },
  {
    id: MaterialId.lava,
    label: 'Lava',
    behavior: MaterialBehavior.liquid,
    density: 80,
    color: [226, 104, 38],
    jitter: 20,
    dispersion: 1,
    drag: 0.8,
    conductivity: 0.25,
    startTemperature: 1250,
    selfHeat: 1250,
    cold: { at: 850, into: MaterialId.stone },
    emissive: true,
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
    conductivity: 0.35,
    hot: { at: 100, into: MaterialId.steam },
    // Deep-freeze only: ice spreading is the contact rule in reactions.ts. Leaving this near 0
    // let a growing ice mass crash the pool's temperature and snap-freeze the lot in a second.
    cold: { at: -40, into: MaterialId.ice },
  },
  {
    id: MaterialId.steam,
    label: 'Steam',
    behavior: MaterialBehavior.gas,
    density: 3,
    color: [206, 214, 222],
    jitter: 10,
    dispersion: 3,
    drag: 0,
    conductivity: 0.2,
    startTemperature: 140,
    // Condensation runs off the lifetime clock, not temperature. A cold threshold made steam collapse
    // back to water in the cell it boiled from, so water on lava just flickered in place forever.
    lifetime: 220,
    expiresInto: MaterialId.water,
  },
  {
    id: MaterialId.smoke,
    label: 'Smoke',
    behavior: MaterialBehavior.gas,
    density: 5,
    color: [70, 68, 72],
    jitter: 14,
    dispersion: 2,
    drag: 0,
    conductivity: 0.1,
    startTemperature: 120,
    lifetime: 140,
    expiresInto: MaterialId.empty,
  },
  {
    id: MaterialId.methane,
    label: 'Methane',
    behavior: MaterialBehavior.gas,
    density: 2,
    color: [128, 176, 108],
    jitter: 10,
    dispersion: 3,
    drag: 0,
    conductivity: 0.1,
    ignite: { at: 110, ticks: 10, heat: 900, into: MaterialId.empty },
  },
  {
    id: MaterialId.fire,
    label: 'Fire',
    behavior: MaterialBehavior.gas,
    density: 1,
    color: [244, 148, 40],
    jitter: 26,
    dispersion: 1,
    drag: 0,
    conductivity: 0.4,
    startTemperature: 900,
    selfHeat: 900,
    lifetime: 34,
    expiresInto: MaterialId.smoke,
    clingsToFuel: true,
    emissive: true,
  },
]
