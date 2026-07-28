import { Material, MaterialBehavior, MaterialId, Medium } from '../pixel-world.types'

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

/**
 * The soft materials an ant lives in: it can be painted straight into them and it burrows through them,
 * so a nest can be set down inside a plank rather than only on top of it. The life pass reads the same
 * list to decide what an ant can bore into.
 */
export const ANT_SOFT: readonly MaterialId[] = [MaterialId.wood, MaterialId.plant, MaterialId.vine]

export function canPaintOver(brush: MaterialId, existing: number): boolean {
  // Erase clears anything, and anything can be drawn into open air.
  if (brush === MaterialId.empty || existing === MaterialId.empty) return true
  // Gases are wisps: anything paints through them, including another gas. Otherwise a puff of smoke
  // would block the fire brush, and holding a flame in one spot would smother itself.
  if (MATERIALS[existing].behavior === MaterialBehavior.gas) return true
  // Living things are soft. Dropping a boulder on a fish should land on the fish, not bounce off it.
  if (MATERIALS[existing].life !== undefined) return true
  // An ant lives in wood, so its brush is placed straight into the soft stuff it burrows through — the
  // paint-rank rule would otherwise refuse it, both being solid.
  if (brush === MaterialId.ant && (ANT_SOFT as readonly number[]).includes(existing)) return true
  return PAINT_RANK[MATERIALS[brush].behavior] > PAINT_RANK[MATERIALS[existing].behavior]
}

/** Air yields to anything; static materials yield to nothing; otherwise the denser cell wins. */
export function canDisplace(source: number, target: number): boolean {
  if (target === MaterialId.empty) return true
  const blocker = MATERIALS[target]
  if (blocker.behavior === MaterialBehavior.static) return false
  return blocker.density < MATERIALS[source].density
}

/** Buoyancy runs the comparison the other way, so a bubble climbs through water. */
export function canFloatThrough(source: number, target: number): boolean {
  if (target === MaterialId.empty) return true
  const blocker = MATERIALS[target]
  if (blocker.behavior === MaterialBehavior.static) return false
  return blocker.density > MATERIALS[source].density
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
    blurb: 'Clears anything back to open air.',
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
    blurb: 'Building material. Melts to lava, and acid eats it slowly.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [122, 124, 130],
    jitter: 10,
    dispersion: 0,
    drag: 0,
    conductivity: 0.2,
    // Acid does eat stone, just slowly — glass is the container you build to hold it.
    acidResistance: 0.15,
    // Above lava's own 1250 °C on purpose. `radiate` pulls a neighbour toward a source's temperature
    // and never past it, so lava can heat a stone wall forever without melting it — which is what
    // stops the pair from turning into a chain reaction that eats the world. Only a real heat source
    // (the heat tool, a hotter melt) gets stone over the line.
    hot: { at: 1500, into: MaterialId.lava },
  },
  {
    id: MaterialId.sand,
    label: 'Sand',
    blurb: 'Piles into slopes. Melts to glass.',
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
    blurb: 'Plants grow in it. Wets into mud.',
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
    blurb: 'What most things burn into. Turns to mud in water.',
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
    blurb: 'Burns slowly, leaving ash and smoke.',
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
    blurb: 'Spreads through water. Catches fire in an instant.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [78, 148, 66],
    jitter: 16,
    dispersion: 0,
    drag: 0,
    conductivity: 0.1,
    // Dry leaves: catches at the lowest temperature of anything and flashes over in a moment.
    ignite: { at: 110, ticks: 14, heat: 540, into: MaterialId.ash },
    // Growth budget: a plant fills out a patch and stops. Vine is the endless one.
    uses: 20,
  },
  {
    id: MaterialId.ice,
    label: 'Ice',
    blurb: 'Cold enough to keep itself solid, and it frosts the water it touches.',
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
    blurb: 'Acid-proof, and shatters when something hits it hard enough.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [150, 190, 196],
    jitter: 6,
    dispersion: 0,
    drag: 0,
    conductivity: 0.18,
    acidProof: true,
    shatters: MaterialId.shard,
  },
  {
    id: MaterialId.oil,
    label: 'Oil',
    blurb: 'Floats on water and catches fire easily.',
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
    blurb: 'Eats most things, and wears itself out doing it.',
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
    blurb: 'Sets fire to what it touches. Crusts to stone in water.',
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
    blurb: 'Boils into steam, freezes into ice, and grows plants.',
    behavior: MaterialBehavior.liquid,
    density: 50,
    color: [62, 122, 186],
    jitter: 12,
    dispersion: 5,
    drag: 0.65,
    conductivity: 0.35,
    conductive: true,
    hot: { at: 100, into: MaterialId.steam },
    // Deep-freeze only: ice spreading is the contact rule in reactions.ts. Leaving this near 0
    // let a growing ice mass crash the pool's temperature and snap-freeze the lot in a second.
    cold: { at: -40, into: MaterialId.ice },
  },
  {
    id: MaterialId.steam,
    label: 'Steam',
    blurb: 'Drifts upward and rains back down as water.',
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
    blurb: 'Fades away as it climbs.',
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
    blurb: 'Pools under ceilings and goes off with a bang.',
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
    blurb: 'Brush it over anything that burns.',
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
  {
    id: MaterialId.vine,
    label: 'Vine',
    blurb: 'Creeps through water and never stops.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [54, 112, 84],
    jitter: 18,
    dispersion: 0,
    drag: 0,
    conductivity: 0.1,
    ignite: { at: 120, ticks: 20, heat: 520, into: MaterialId.ash },
  },
  {
    id: MaterialId.salt,
    label: 'Salt',
    blurb: 'Dissolves into brine, which kills plants.',
    behavior: MaterialBehavior.powder,
    density: 62,
    color: [226, 226, 232],
    jitter: 10,
    dispersion: 0,
    drag: 0.7,
    conductivity: 0.15,
  },
  {
    id: MaterialId.saltWater,
    label: 'Salt water',
    blurb: 'Brine. Freezes colder than water and kills plants.',
    behavior: MaterialBehavior.liquid,
    density: 52,
    color: [72, 132, 158],
    jitter: 12,
    dispersion: 5,
    drag: 0.65,
    conductivity: 0.35,
    conductive: true,
    // Brine takes more cooling to freeze and boils a touch hotter than fresh water.
    hot: { at: 108, into: MaterialId.steam },
    cold: { at: -60, into: MaterialId.ice },
  },
  {
    id: MaterialId.snow,
    label: 'Snow',
    blurb: 'Melts above freezing. Packs into ice under weight.',
    behavior: MaterialBehavior.powder,
    density: 30,
    color: [230, 238, 244],
    jitter: 8,
    dispersion: 0,
    // Heaps steeper than sand and holds together, but unlike ice it keeps no cold of its own: indoors
    // it melts, which is the point of having both.
    steep: true,
    drag: 0.5,
    conductivity: 0.25,
    startTemperature: -8,
    hot: { at: 2, into: MaterialId.water },
  },
  {
    id: MaterialId.gravel,
    label: 'Gravel',
    blurb: 'Piles steeper than sand and shrugs off acid.',
    behavior: MaterialBehavior.powder,
    density: 90,
    color: [140, 136, 128],
    jitter: 16,
    dispersion: 0,
    steep: true,
    drag: 0.8,
    conductivity: 0.2,
    acidResistance: 0.4,
  },
  {
    id: MaterialId.seed,
    label: 'Seed',
    blurb: 'Sprouts into a plant in wet dirt.',
    behavior: MaterialBehavior.powder,
    density: 58,
    color: [186, 152, 84],
    jitter: 12,
    dispersion: 0,
    drag: 0.6,
    conductivity: 0.12,
    ignite: { at: 130, ticks: 16, heat: 500, into: MaterialId.ash },
  },
  {
    id: MaterialId.honey,
    label: 'Honey',
    blurb: 'Creeps rather than flows.',
    behavior: MaterialBehavior.liquid,
    density: 70,
    color: [214, 154, 44],
    jitter: 12,
    // Dispersion 1 is the whole character: it creeps outward a cell at a time instead of flowing.
    dispersion: 1,
    drag: 0.92,
    conductivity: 0.12,
    ignite: { at: 220, ticks: 90, heat: 520, into: MaterialId.ash },
  },
  {
    id: MaterialId.mud,
    label: 'Mud',
    blurb: 'Dirt plus water. Dries back out in heat.',
    behavior: MaterialBehavior.liquid,
    density: 78,
    color: [92, 68, 44],
    jitter: 12,
    dispersion: 2,
    drag: 0.88,
    conductivity: 0.2,
    // Bakes back to dirt.
    hot: { at: 130, into: MaterialId.dirt },
  },
  {
    id: MaterialId.nitrogen,
    label: 'Nitrogen',
    blurb: 'Freezes what it touches, then boils away.',
    behavior: MaterialBehavior.liquid,
    density: 35,
    color: [178, 216, 236],
    jitter: 10,
    dispersion: 5,
    drag: 0.4,
    conductivity: 0.45,
    startTemperature: -190,
    selfHeat: -190,
    // Evaporation is a surface effect in reactions.ts, not a clock. A lifetime made a whole puddle
    // vanish in one instant, because every cell was painted on the same tick and so expired together.
  },
  {
    id: MaterialId.sponge,
    label: 'Sponge',
    blurb: 'Soaks up liquid and gives it back when heated.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [216, 196, 108],
    jitter: 14,
    dispersion: 0,
    drag: 0,
    conductivity: 0.1,
    absorbs: 8,
    ignite: { at: 200, ticks: 60, heat: 540, into: MaterialId.ash },
  },
  {
    id: MaterialId.metal,
    label: 'Metal',
    blurb: 'Carries heat and sparks fast, and nothing melts it.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [168, 176, 188],
    jitter: 12,
    dispersion: 0,
    drag: 0,
    // Far and away the best conductor, so a bar carries heat across a gap and a spark along its length.
    conductivity: 0.85,
    conductive: true,
    // Metal does not melt, and does not break. It is the one material a build can rely on staying exactly
    // where it was put, and what it trades for that is any phase of its own: heat and sparks travel through it
    // and it is otherwise inert.
  },
  {
    id: MaterialId.rubber,
    label: 'Rubber',
    blurb: 'Bounces when something throws it. Melts to oil.',
    // Loose, not structural. As a static material a thrown clump of it hung wherever it stopped —
    // static cells have no falling of their own, and a clump holds itself up.
    behavior: MaterialBehavior.powder,
    density: 120,
    color: [58, 56, 62],
    jitter: 10,
    dispersion: 0,
    drag: 0.5,
    conductivity: 0.06,
    hot: { at: 220, into: MaterialId.oil },
    // The one material with a real bounce: thrown, it visibly rebounds before it settles.
    restitution: 0.75,
  },
  {
    id: MaterialId.spark,
    label: 'Spark',
    blurb: 'Runs along metal and water, and sets off gas.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [252, 240, 160],
    jitter: 10,
    dispersion: 0,
    drag: 0,
    conductivity: 0.5,
    startTemperature: 620,
    selfHeat: 620,
    lifetime: 60,
    expiresInto: MaterialId.empty,
    emissive: true,
  },
  {
    id: MaterialId.ember,
    label: 'Ember',
    blurb: 'Cooling fire that relights the fuel it lands on.',
    behavior: MaterialBehavior.gas,
    density: 4,
    color: [220, 96, 40],
    jitter: 20,
    dispersion: 1,
    drag: 0,
    conductivity: 0.35,
    startTemperature: 520,
    selfHeat: 520,
    // Longer lived and cooler than flame: embers sit in the ash and relight anything that drifts in.
    lifetime: 140,
    expiresInto: MaterialId.ash,
    clingsToFuel: true,
    emissive: true,
  },
  {
    id: MaterialId.void,
    label: 'Void',
    blurb: 'Deletes whatever touches it.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [26, 14, 32],
    jitter: 6,
    dispersion: 0,
    drag: 0,
    conductivity: 0.05,
    acidProof: true,
  },
  {
    id: MaterialId.source,
    label: 'Source',
    blurb: 'Copies the first material you feed it, forever.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [126, 100, 204],
    jitter: 10,
    dispersion: 0,
    drag: 0,
    conductivity: 0.2,
    acidProof: true,
  },
  {
    id: MaterialId.chlorine,
    label: 'Chlorine',
    blurb: 'Sinks and creeps along the ground. Kills anything alive.',
    behavior: MaterialBehavior.gas,
    density: 8,
    color: [190, 214, 96],
    jitter: 12,
    dispersion: 4,
    drag: 0,
    conductivity: 0.1,
    // Heavier than air: it pours downward and pools in the low ground instead of rising.
    sinks: true,
  },
  {
    id: MaterialId.tnt,
    label: 'TNT',
    blurb: 'Goes off when it gets hot, and takes its neighbours with it.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [178, 62, 58],
    jitter: 8,
    dispersion: 0,
    drag: 0,
    conductivity: 0.12,
    // Goes off well below wood's ignition point, so a fire reaching a charge is always the charge's story.
    // Tuned against the demo it exists for: at a third less impulse a buried charge only slumped the
    // sand hill above it, because thirty cells of powder soak up most of the throw.
    explodes: { at: 160, radius: 24, impulse: 5.4, heat: 700, into: MaterialId.fire },
  },
  {
    id: MaterialId.gunpowder,
    label: 'Gunpowder',
    blurb: 'Light one grain and a whole trail of it goes up in a flash.',
    behavior: MaterialBehavior.powder,
    density: 90,
    color: [72, 70, 76],
    jitter: 12,
    dispersion: 0,
    drag: 0.6,
    conductivity: 0.14,
    // A grain of it is a spark, not a bomb: small radius, and the heat is what runs a trail of it.
    explodes: { at: 120, radius: 5, impulse: 1.6, heat: 420, into: MaterialId.fire },
  },
  {
    id: MaterialId.shard,
    label: 'Shards',
    blurb: 'Broken glass, light enough to be thrown about.',
    behavior: MaterialBehavior.powder,
    // Splinters, so they are light enough to be thrown a long way and still sink in water.
    density: 55,
    color: [150, 190, 196],
    jitter: 14,
    dispersion: 0,
    drag: 0.4,
    conductivity: 0.18,
    acidProof: true,
    // Melts back to molten sand at the same heat glass came from, so shards can be recycled.
    hot: { at: 1700, into: MaterialId.lava },
  },
  {
    id: MaterialId.algae,
    label: 'Algae',
    blurb: 'Lives on light and spreads through water. Fish food.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [86, 150, 92],
    jitter: 14,
    dispersion: 0,
    drag: 0,
    conductivity: 0.2,
    // A weed leaves nothing behind when it dies: boiling a pond should not fill it with meat.
    hot: { at: 70, into: MaterialId.empty },
    cold: { at: -6, into: MaterialId.empty },
    life: {
      medium: Medium.water,
      // Nothing to eat: it earns its energy by existing, which is what makes it the base of the chain.
      diet: [],
      startEnergy: 70,
      nutrition: 0,
      feedChance: 0,
      // It gains rather than spends: the energy comes from light, not from eating.
      burnRate: 0,
      light: 0.2,
      moveChance: 0,
      breedAt: 100,
      breedChance: 0.05,
      corpse: MaterialId.empty,
    },
  },
  {
    id: MaterialId.fish,
    label: 'Fish',
    blurb: 'Grazes on algae, and drowns in the air.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [92, 164, 214],
    jitter: 12,
    dispersion: 0,
    drag: 0,
    conductivity: 0.25,
    hot: { at: 60, into: MaterialId.meat },
    cold: { at: -2, into: MaterialId.meat },
    life: {
      medium: Medium.water,
      diet: [MaterialId.algae],
      startEnergy: 140,
      nutrition: 20,
      // Grazing has to beat its own metabolism when there is food about: at a fiftieth it starved in a
      // tank full of algae, because it only ever got a bite in when it happened to linger.
      feedChance: 0.1,
      burnRate: 0.12,
      moveChance: 0.5,
      // Comfortably under the byte ceiling: at 250 a fish dropped back below the line within a few ticks
      // of filling up, so the breeding roll almost never landed.
      breedAt: 200,
      breedChance: 0.004,
      // Far enough to find a bed of algae across open water. Any shorter and a fish in a big tank wanders
      // until it starves with a garden ten cells below it.
      hunts: 18,
      corpse: MaterialId.meat,
    },
  },
  {
    id: MaterialId.bug,
    label: 'Bug',
    blurb: 'Walks on solid ground eating plants, and avoids water.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [176, 140, 62],
    jitter: 14,
    dispersion: 0,
    drag: 0,
    conductivity: 0.15,
    hot: { at: 70, into: MaterialId.meat },
    cold: { at: -8, into: MaterialId.meat },
    life: {
      medium: Medium.surface,
      diet: [
        MaterialId.plant,
        MaterialId.vine,
        MaterialId.meat,
        MaterialId.ant,
        MaterialId.popcorn,
      ],
      startEnergy: 120,
      nutrition: 30,
      feedChance: 0.1,
      // Frugal. Grass only regrows into wet soil, so a lawn is close to a fixed number of meals: on a
      // metabolism like a bird's, a crowd of bugs strips it and starves inside a minute.
      burnRate: 0.03,
      moveChance: 0.35,
      breedAt: 190,
      breedChance: 0.002,
      // Far enough to spot a plant along a bank. At four it starved a few cells from lunch.
      hunts: 12,
      corpse: MaterialId.meat,
    },
  },
  {
    id: MaterialId.worm,
    label: 'Worm',
    blurb: 'Burrows through dirt and eats its way along.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [198, 126, 132],
    jitter: 12,
    dispersion: 0,
    drag: 0,
    conductivity: 0.15,
    hot: { at: 60, into: MaterialId.meat },
    cold: { at: -6, into: MaterialId.meat },
    life: {
      medium: Medium.soil,
      diet: [MaterialId.dirt, MaterialId.mud],
      startEnergy: 130,
      // Dirt is unlimited, so nothing outside the worm bounds its numbers: a mouthful is worth little and
      // births are rare, or a bank of soil turns into four hundred worms and then a field of corpses.
      nutrition: 12,
      feedChance: 0.05,
      burnRate: 0.14,
      moveChance: 0.25,
      breedAt: 190,
      breedChance: 0.0015,
      corpse: MaterialId.meat,
    },
  },
  {
    id: MaterialId.bird,
    label: 'Bird',
    blurb: 'Flies, and dives at bugs and fish from a distance.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [214, 210, 220],
    jitter: 10,
    dispersion: 0,
    drag: 0,
    conductivity: 0.15,
    hot: { at: 75, into: MaterialId.meat },
    cold: { at: -12, into: MaterialId.meat },
    life: {
      medium: Medium.air,
      diet: [MaterialId.bug, MaterialId.worm, MaterialId.fish, MaterialId.meat, MaterialId.ant],
      startEnergy: 170,
      nutrition: 60,
      feedChance: 0.14,
      // Flying is expensive, but not so expensive that it has to eat every two seconds: at a thirtieth a
      // bird never ran out at all, and at a third it starved between one bug and the next.
      burnRate: 0.1,
      moveChance: 0.7,
      breedAt: 205,
      breedChance: 0.003,
      hunts: 18,
      corpse: MaterialId.meat,
    },
  },
  {
    id: MaterialId.slime,
    label: 'Slime',
    blurb: 'Slow, at home anywhere, and leaps at anything alive.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [148, 92, 190],
    jitter: 16,
    dispersion: 0,
    drag: 0,
    conductivity: 0.18,
    hot: { at: 110, into: MaterialId.meat },
    cold: { at: -30, into: MaterialId.meat },
    emissive: true,
    life: {
      medium: Medium.any,
      // Creatures only. With algae on the menu it could live off the garden, and one slime turned a whole
      // tank into a hundred slimes that then sat there forever.
      diet: [
        MaterialId.fish,
        MaterialId.bug,
        MaterialId.worm,
        MaterialId.bird,
        MaterialId.meat,
        MaterialId.ant,
      ],
      startEnergy: 150,
      nutrition: 55,
      feedChance: 0.12,
      // Hungry, but not frantic: it still runs down when the hunting stops, which is what keeps it a monster
      // rather than grey goo, and at a fifth it starved before it had crossed the room.
      burnRate: 0.08,
      moveChance: 0.14,
      breedAt: 210,
      breedChance: 0.002,
      hunts: 14,
      // It can neither fly like a bird nor burrow like a worm, so a ledge or a boulder would otherwise end
      // the hunt. A leap is how the slowest hunter in the world reaches anything at all.
      jump: 6,
      corpse: MaterialId.meat,
    },
  },
  {
    id: MaterialId.meat,
    label: 'Meat',
    blurb: 'What everything dies into. Bugs and birds pick at it, and it rots.',
    behavior: MaterialBehavior.powder,
    density: 70,
    color: [162, 74, 78],
    jitter: 14,
    dispersion: 0,
    drag: 0.6,
    conductivity: 0.15,
    ignite: { at: 220, ticks: 90, heat: 420, into: MaterialId.ash },
  },
  {
    id: MaterialId.ant,
    label: 'Ant',
    blurb: 'Bores galleries through wood. Walls each path as it digs.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [140, 62, 46],
    jitter: 8,
    dispersion: 0,
    drag: 0,
    conductivity: 0.15,
    hot: { at: 70, into: MaterialId.meat },
    cold: { at: -8, into: MaterialId.meat },
    life: {
      // At home anywhere it fits, so an ant crawling a bare stretch between one leaf and the next is not
      // stranded and left to drain out.
      medium: Medium.any,
      // Leaves are its fuel, not the vine it trails: an ant that grazed its own web would unbuild it as
      // fast as it built it. Popcorn is the exception it will cross a room for.
      diet: [MaterialId.plant, MaterialId.popcorn],
      startEnergy: 200,
      nutrition: 60,
      feedChance: 0.1,
      // Slow to burn, so a nest keeps building for a good while on a patch of leaves.
      burnRate: 0.03,
      // Unhurried, so a trail reads as being laid a length at a time rather than sprayed across the world.
      moveChance: 0.3,
      // Above its starting energy on purpose: an ant only breeds where it has grazed well, so a nest grows
      // into a stand of leaves rather than swarming out of a single one. Bugs, birds and slimes all eat ants
      // now, and a nest walled off from them still has to replace what starves, so the rate is what keeps a
      // colony going rather than dwindling to nothing.
      breedAt: 230,
      breedChance: 0.0003,
      // A hungry ant steers for the nearest leaf it can see. Without this it bores on blindly and starves in
      // a nest with a crop at the far end of it, which is what emptied a sealed case every time.
      hunts: 36,
      corpse: MaterialId.meat,
    },
  },
  {
    id: MaterialId.pollen,
    label: 'Pollen',
    blurb: 'Rides the faintest draught. Sprouts into a seed on wet ground.',
    behavior: MaterialBehavior.powder,
    // The lightest thing in the world by a distance: snow is 30 and ash 40. The air pass scales what it can
    // lift by how light a material is, and this is the one that rides a breath of it.
    density: 6,
    color: [226, 205, 122],
    jitter: 18,
    dispersion: 0,
    drag: 0,
    conductivity: 0.05,
    // It still burns, but nowhere near as readily: at 180 a cloud of it went up before it had gone anywhere,
    // and something you cannot watch travel is a poor advertisement for the thing that carries it.
    ignite: { at: 420, ticks: 4, heat: 520, into: MaterialId.empty },
  },
  {
    id: MaterialId.kernel,
    label: 'Kernel',
    blurb: 'Jumps when it gets hot, and lands as popcorn.',
    behavior: MaterialBehavior.powder,
    density: 45,
    color: [198, 158, 86],
    jitter: 10,
    dispersion: 0,
    drag: 0.2,
    conductivity: 0.1,
    // One way on purpose. A thing that keeps popping never settles, and three separate bugs in this project
    // have been exactly that: bouncing gravel, dirt jittering on lava, dirt climbing the volcano.
    hot: { at: 180, into: MaterialId.popcorn },
    // Hard, and harder than a firework launches at, because a kernel buried in a pan spends nearly all of it
    // on the thud into the cell above: a popped cell keeps an eighth of its speed off a knock. At a third of
    // this the pop was a swap in place, and the only thing that visibly moved popcorn was a firework's
    // draught. Kept below the kinetic pass's own ceiling of 16 so the number here is the number that acts.
    pops: 14,
  },
  {
    id: MaterialId.popcorn,
    label: 'Popcorn',
    blurb: 'What a kernel turns into. Light enough to blow about, and bugs eat it.',
    behavior: MaterialBehavior.powder,
    density: 20,
    color: [236, 226, 199],
    jitter: 14,
    dispersion: 0,
    drag: 0.35,
    conductivity: 0.08,
    // Burns like the dry husk it is, and leaves ash — but well above the 180 its kernel pops at. At 260 a pile
    // on a hot plate charred as fast as it popped, so the whole trick happened and was gone.
    ignite: { at: 520, ticks: 24, heat: 560, into: MaterialId.ash },
  },
  {
    id: MaterialId.blackHole,
    label: 'Black hole',
    blurb: 'Pulls in everything loose around it, and what reaches it is gone.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [22, 18, 34],
    jitter: 4,
    dispersion: 0,
    drag: 0,
    conductivity: 0.02,
    acidProof: true,
  },
  {
    id: MaterialId.turbine,
    label: 'Turbine',
    blurb: 'Spins the air around it, so loose things nearby get swept round.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [126, 148, 168],
    jitter: 6,
    dispersion: 0,
    drag: 0,
    conductivity: 0.4,
  },
  {
    id: MaterialId.randomSource,
    label: 'Wild source',
    blurb: 'Pours out something different every time. Never anything solid.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [156, 122, 196],
    jitter: 10,
    dispersion: 0,
    drag: 0,
    conductivity: 0.1,
    acidProof: true,
  },
  {
    id: MaterialId.corruption,
    label: 'Corruption',
    blurb: 'Turns whatever it touches into more of itself. Only fire stops it.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [92, 44, 118],
    jitter: 16,
    dispersion: 0,
    drag: 0,
    conductivity: 0.1,
    // The one weakness, and it has to be a weakness the player already has and pays to use. A wall it could
    // not cross would make it a non-threat; nothing stopping it would make it a timer. Fire is neither.
    //
    // It leaves ash rather than what it ate: remembering that needs a byte per cell, and `data` has none
    // spare — gas lifetime, acid charges, plant growth and life energy already share it.
    ignite: { at: 220, ticks: 30, heat: 420, into: MaterialId.ash },
  },
  {
    id: MaterialId.glue,
    label: 'Glue',
    blurb: 'Pours like syrup, then sets hard. Build a shape and wait.',
    behavior: MaterialBehavior.liquid,
    density: 70,
    color: [214, 206, 168],
    jitter: 8,
    // Thick. It has to hold a shape long enough to be worth pouring one.
    dispersion: 1,
    drag: 0.6,
    conductivity: 0.12,
    // The setting is the gas-lifetime mechanism, unchanged: a clock in `data` that `advanceTimers` counts
    // down, and a material to become at zero. Nothing new was needed for it.
    lifetime: 150,
    expiresInto: MaterialId.resin,
  },
  {
    id: MaterialId.resin,
    label: 'Resin',
    blurb: 'What glue sets into. Holds like stone until something hits it.',
    behavior: MaterialBehavior.static,
    density: 1000,
    color: [196, 150, 82],
    jitter: 10,
    dispersion: 0,
    drag: 0,
    conductivity: 0.15,
    // Brittle, which is the trade for setting so quickly: it holds a shape but not a beating.
    shatters: MaterialId.shard,
    ignite: { at: 300, ticks: 40, heat: 380, into: MaterialId.ash },
  },
  {
    id: MaterialId.firework,
    label: 'Firework',
    blurb: 'Light it and it flies, then bursts into a spray of sparks.',
    behavior: MaterialBehavior.powder,
    density: 50,
    color: [204, 92, 108],
    jitter: 10,
    dispersion: 0,
    drag: 0.2,
    conductivity: 0.12,
    // Heat launches it, on the same `pops` mechanism a kernel uses: a shove upward the moment it turns. Its
    // own figure is gentler than the kernel's, because this one has open sky above it rather than a pan of
    // kernels to fight through.
    hot: { at: 200, into: MaterialId.fireworkLit },
    pops: 11,
  },
  {
    id: MaterialId.fireworkLit,
    label: 'Firework, lit',
    blurb: 'On its way up, and about to go off.',
    behavior: MaterialBehavior.powder,
    density: 50,
    color: [246, 208, 132],
    jitter: 20,
    dispersion: 0,
    drag: 0.1,
    conductivity: 0.12,
    emissive: true,
    // Long enough to clear the ground it launched from before it goes.
    lifetime: 40,
    expiresInto: MaterialId.smoke,
    // Trails, not a blast. `detonate` would make an explosion in the sky, which is the one thing a firework
    // must not look like.
    bursts: { sparks: 22, speed: 7, product: MaterialId.ember },
  },
]

/**
 * Whether a force or an impact can pick a cell up at all. Static materials are the world's scaffolding:
 * a wall you built should not drift toward the pointer, blow away in the wind, or get shoved along by
 * something landing on it. A flat lookup because the blast and kinetic passes both ask it per cell.
 */
const MOVABLE = new Uint8Array(
  MATERIALS.map(({ id, behavior }) =>
    id !== MaterialId.empty && behavior !== MaterialBehavior.static ? 1 : 0
  )
)

export function isMovable(id: number): boolean {
  return MOVABLE[id] === 1
}
