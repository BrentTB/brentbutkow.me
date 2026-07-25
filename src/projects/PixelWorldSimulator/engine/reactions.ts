import { Grid, MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'
import { asMaterial, cellIndex, placeMaterial, transformCell } from './grid'
import { Rng } from './rng'

/** Chance per tick that a drop of acid eats one of its neighbours. */
const DISSOLVE_CHANCE = 0.14
/**
 * Chance per tick that a plant cell puts out a shoot. High on purpose: a falling drop is only touching
 * for a tick or two, and at a low chance pouring water past a vine did nothing at all. What bounds the
 * spread is the growth budget in `data`, not this number, so speed and extent tune separately.
 */
const GROWTH_CHANCE = 0.5
/**
 * Frost is a contact rule, not a temperature race — driven off thresholds it either stalled a degree
 * short of freezing or took a whole pool in a second. Ice grabs water it touches almost every time,
 * then sits out `FROST_COOLDOWN` ticks: that keeps the creep slow while still catching a drop that is
 * only next to the cube for a moment.
 */
const FROST_ON_CONTACT = 0.8
/**
 * Each cell draws its own rest from this range. A single shared cooldown phase-locks the whole sheet:
 * a batch of cells freezes on the same tick, rests in lockstep, and wakes together, so the ice advances
 * in visible pulses instead of creeping.
 */
const FROST_REST_MIN = 25
const FROST_REST_SPREAD = 70
/** Chance per tick that buried snow compacts into ice. */
const PACK_CHANCE = 0.004
/** Chance per tick that a sponge pulls in a touching drop, and the temperature that wrings it out. */
const SOAK_CHANCE = 0.25
const WRING_TEMPERATURE = 90
/**
 * Chance per tick that one cell of source produces. Low, because output scales with a block's area: at a
 * quarter, a modest 8x8 block poured out roughly eighteen cells a tick, which drowns a world.
 */
const EMIT_CHANCE = 0.06
/**
 * How far a source will push its output to find space. A source that could only fill the cell next to it
 * stalled as soon as its own product surrounded it, so a big block produced no more than its outline.
 * Pushing through what it has already made turns it into a pump.
 */
const EMIT_REACH = 20
/** Chance per tick that a void eats one of its neighbours. */
const CONSUME_CHANCE = 0.5
/** Chance per tick that a spark jumps to the next conductive cell. */
const CONDUCT_CHANCE = 0.8
/**
 * How hot a spark leaves the wire behind it. Resistive heating is what makes a circuit useful: without
 * it a spark warmed only whatever it happened to be beside at the time, so running one down a metal bar
 * never lit the wood at the far end.
 */
const HOT_WIRE = 520
/**
 * Chance per tick that an exposed cell of liquid nitrogen boils away, scaled by how much air is around
 * it. A puddle evaporates from its surface inward, and the middle keeps itself cold for a while.
 */
const BOIL_OFF_CHANCE = 0.045
/** Chance per tick that a full sponge cell passes water on to a drier one beside it. */
const WICK_CHANCE = 0.4

/** Neighbour offsets. */
const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
]

/**
 * Where a shoot goes, as repeated entries for weighting: upward most often, but every direction is
 * possible. A strict up-then-sideways-then-down order grew perfectly flat-bottomed blobs, because in a
 * pool there was always water above to take first.
 */
const SHOOT_BIAS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, -1],
  [0, -1],
  [-1, 0],
  [-1, 0],
  [1, 0],
  [1, 0],
  [0, 1],
  [0, 1],
]

/**
 * A pair that transforms on contact. Most of the sim's chemistry is this shape, so it lives as data:
 * anything needing memory, a budget, or a search of its own gets a function below instead.
 */
type ContactRule = {
  /** The acting cell. */
  material: MaterialId
  /** What it has to be touching. */
  neighbour: MaterialId
  /** What the acting cell leaves behind. Omitted means it stays as it is. */
  becomes?: MaterialId
  /** What the neighbour turns into. Omitted means the neighbour survives. */
  neighbourBecomes?: MaterialId
  chance: number
}

const CONTACT_RULES: readonly ContactRule[] = [
  // Salt dissolves away and takes the water with it, leaving brine.
  {
    material: MaterialId.salt,
    neighbour: MaterialId.water,
    becomes: MaterialId.empty,
    neighbourBecomes: MaterialId.saltWater,
    chance: 0.4,
  },
  // Loose ground soaks up a drop and turns to mud.
  {
    material: MaterialId.dirt,
    neighbour: MaterialId.water,
    becomes: MaterialId.mud,
    neighbourBecomes: MaterialId.empty,
    chance: 0.3,
  },
  {
    material: MaterialId.ash,
    neighbour: MaterialId.water,
    becomes: MaterialId.mud,
    neighbourBecomes: MaterialId.empty,
    chance: 0.2,
  },
  // Wet ground is what a seed needs.
  { material: MaterialId.seed, neighbour: MaterialId.mud, becomes: MaterialId.plant, chance: 0.06 },
  // Brine kills what fresh water grows.
  {
    material: MaterialId.saltWater,
    neighbour: MaterialId.plant,
    neighbourBecomes: MaterialId.ash,
    chance: 0.05,
  },
  {
    material: MaterialId.saltWater,
    neighbour: MaterialId.vine,
    neighbourBecomes: MaterialId.ash,
    chance: 0.05,
  },
  // Chlorine is bleach: it kills what grows and dissolves into brine.
  {
    material: MaterialId.chlorine,
    neighbour: MaterialId.plant,
    neighbourBecomes: MaterialId.ash,
    chance: 0.08,
  },
  {
    material: MaterialId.chlorine,
    neighbour: MaterialId.vine,
    neighbourBecomes: MaterialId.ash,
    chance: 0.08,
  },
  {
    material: MaterialId.chlorine,
    neighbour: MaterialId.water,
    becomes: MaterialId.empty,
    neighbourBecomes: MaterialId.saltWater,
    chance: 0.05,
  },
  // Nitrogen freezes what it touches and boils away doing it: one cell of coolant per cell of ice.
  // A temperature race can't do this now that it evaporates quickly — the same reason frost is a rule.
  {
    material: MaterialId.nitrogen,
    neighbour: MaterialId.water,
    becomes: MaterialId.empty,
    neighbourBecomes: MaterialId.ice,
    chance: 0.5,
  },
  {
    material: MaterialId.nitrogen,
    neighbour: MaterialId.saltWater,
    becomes: MaterialId.empty,
    neighbourBecomes: MaterialId.ice,
    chance: 0.4,
  },
  // A spark in a gas pocket sets it off. Phase 4 gives that a shove as well as a flame.
  {
    material: MaterialId.spark,
    neighbour: MaterialId.methane,
    neighbourBecomes: MaterialId.fire,
    chance: 1,
  },
]

/** A rule with its neighbour test built, so matching costs a call rather than a closure. */
type CompiledRule = ContactRule & { matches: (found: number) => boolean }

/** Rules indexed by the acting material, so the hot loop looks up instead of scanning the table. */
const RULES_BY_MATERIAL: readonly (readonly CompiledRule[])[] = MATERIALS.map((material) =>
  CONTACT_RULES.filter((rule) => rule.material === material.id).map((rule) => ({
    ...rule,
    matches: (found: number) => found === rule.neighbour,
  }))
)

// Neighbour tests the reactions reuse every tick, built once. Written inline they were a fresh
// closure per rule per reactive cell, which is thousands of throwaway objects a tick in a busy world.
const isEmpty = (found: number) => found === MaterialId.empty
const isWater = (found: number) => found === MaterialId.water
const isSponge = (found: number) => found === MaterialId.sponge
const isSource = (found: number) => found === MaterialId.source
const isFeed = (found: number) => found !== MaterialId.empty && found !== MaterialId.source
const isConductive = (found: number) => MATERIALS[found].conductive === true
const isEdible = (found: number) => found !== MaterialId.empty && found !== MaterialId.void
const isCorrodible = (found: number) =>
  found !== MaterialId.empty && found !== MaterialId.acid && MATERIALS[found].acidProof !== true

/**
 * The chemistry the heat field can't express: pairs that transform on contact, plus the handful of
 * behaviours that need more than a lookup — acid spending charges, plants and vines creeping, frost,
 * sponges soaking, sources emitting, voids eating, and sparks running down a wire. Everything
 * temperature-driven lives in heat.ts instead.
 */
export function applyReactions(grid: Grid, rng: Rng): void {
  const { width, height, material } = grid
  // A spark travels by writing itself into a neighbour, so the scan can meet the same spark again
  // further along and move it a second time. `moved` marks where one has already gone; `step` clears
  // the array again before it does its own pass, so the two never read each other's flags.
  grid.moved.fill(0)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const id = material[index]
      if (id === MaterialId.empty) continue

      if (RULES_BY_MATERIAL[id].length > 0)
        applyContactRules(grid, rng, x, y, index, asMaterial(id))

      if (id === MaterialId.acid) dissolve(grid, rng, x, y, index)
      else if (id === MaterialId.plant) grow(grid, rng, x, y, index)
      else if (id === MaterialId.vine) creep(grid, rng, x, y)
      else if (id === MaterialId.ice) frost(grid, rng, x, y, index)
      else if (id === MaterialId.snow) pack(grid, rng, x, y, index)
      else if (id === MaterialId.sponge) soak(grid, rng, x, y, index)
      else if (id === MaterialId.source) emit(grid, rng, x, y, index)
      else if (id === MaterialId.void) consume(grid, rng, x, y)
      else if (id === MaterialId.spark) conduct(grid, rng, x, y, index)
      else if (id === MaterialId.nitrogen) boilOff(grid, rng, x, y, index)
    }
  }
}

function applyContactRules(
  grid: Grid,
  rng: Rng,
  x: number,
  y: number,
  index: number,
  id: MaterialId
): void {
  for (const rule of RULES_BY_MATERIAL[id]) {
    const target = pickNeighbour(
      grid,
      x,
      y,
      rule.matches,
      Math.floor(rng.next() * NEIGHBOURS.length)
    )
    if (target < 0 || !rng.chance(rule.chance)) continue

    if (rule.neighbourBecomes !== undefined) becomeCell(grid, target, rule.neighbourBecomes)
    if (rule.becomes !== undefined) {
      becomeCell(grid, index, rule.becomes)
      return
    }
  }
}

/**
 * A product that carries its own starting temperature gets it; anything else inherits the heat that was
 * already in the cell. Ice made from room-temperature water would otherwise sit above its own melting
 * point and turn straight back into water.
 */
function becomeCell(grid: Grid, index: number, material: MaterialId): void {
  if (MATERIALS[material].startTemperature !== undefined) {
    placeMaterial(grid, index, material)
    return
  }
  transformCell(grid, index, material)
}

/** Snow buried under more snow compacts into ice, so a deep drift turns solid from the bottom up. */
function pack(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (y < 2 || !rng.chance(PACK_CHANCE)) return

  const above = grid.material[cellIndex(grid, x, y - 1)]
  const higher = grid.material[cellIndex(grid, x, y - 2)]
  const buried =
    (above === MaterialId.snow || above === MaterialId.ice) &&
    (higher === MaterialId.snow || higher === MaterialId.ice)

  if (buried) placeMaterial(grid, index, MaterialId.ice)
}

/**
 * A sponge pulls in touching water until it is full, and gives it back when something heats it. The
 * count of soaked cells lives in `data`.
 */
function soak(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  const capacity = MATERIALS[MaterialId.sponge].absorbs ?? 0
  const held = grid.data[index]

  // A hot sponge only ever gives water up. Letting it drink as well made an empty hot sponge drink on
  // one tick and wring out on the next, forever, ending on whichever side of the loop time ran out.
  if (grid.temperature[index] > WRING_TEMPERATURE) {
    if (held === 0) return

    const air = pickNeighbour(grid, x, y, isEmpty)
    if (air < 0) return
    placeMaterial(grid, air, MaterialId.water)
    grid.data[index] = held - 1
    return
  }

  // A full cell passes water inward, so the dry middle of a block keeps drawing from the wet edge.
  // Without it only the outer layer ever gets wet and a thick sponge holds no more than a thin one.
  if (held >= capacity) {
    if (!rng.chance(WICK_CHANCE)) return

    const drier = pickNeighbour(
      grid,
      x,
      y,
      isSponge,
      Math.floor(rng.next() * NEIGHBOURS.length),
      (candidate) => grid.data[candidate] < capacity
    )
    if (drier < 0) return

    grid.data[drier] += 1
    grid.data[index] = held - 1
    return
  }

  if (!rng.chance(SOAK_CHANCE)) return

  const drop = pickNeighbour(grid, x, y, isWater, Math.floor(rng.next() * NEIGHBOURS.length))
  if (drop < 0) return

  transformCell(grid, drop, MaterialId.empty)
  grid.data[index] = held + 1
}

/**
 * A source remembers the first material fed to it — the id sits in `data` — and then produces it
 * forever. That is what makes an endless waterfall or a lava vent possible without a brush held down.
 */
function emit(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  const remembered = grid.data[index]

  if (remembered === MaterialId.empty) {
    const start = Math.floor(rng.next() * NEIGHBOURS.length)

    // Learn from whatever is fed in, or from a neighbouring source that already knows. Without the
    // second half, the inside of a block can never learn anything — every one of its neighbours is
    // another source — so only the outline of a big block ever produced, and output grew with its
    // perimeter rather than its area.
    const fed = pickNeighbour(grid, x, y, isFeed, start)
    if (fed >= 0) {
      grid.data[index] = grid.material[fed]
      return
    }

    const knowing = pickNeighbour(
      grid,
      x,
      y,
      isSource,
      start,
      (candidate) => grid.data[candidate] !== MaterialId.empty
    )
    if (knowing >= 0) grid.data[index] = grid.data[knowing]
    return
  }

  if (!rng.chance(EMIT_CHANCE)) return

  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  for (let step = 0; step < NEIGHBOURS.length; step++) {
    const [dx, dy] = NEIGHBOURS[(start + step) % NEIGHBOURS.length]
    const space = spaceAlong(grid, x, y, dx, dy, remembered)
    if (space >= 0) {
      placeMaterial(grid, space, asMaterial(remembered))
      return
    }
  }
}

/**
 * The first empty cell along one direction, pushing through the source's own output on the way. Anything
 * else — a wall, another material — stops the search, so a source can't shove its way through terrain.
 */
function spaceAlong(
  grid: Grid,
  x: number,
  y: number,
  dx: number,
  dy: number,
  product: number
): number {
  for (let distance = 1; distance <= EMIT_REACH; distance++) {
    const nx = x + dx * distance
    const ny = y + dy * distance
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) return -1

    const index = cellIndex(grid, nx, ny)
    const found = grid.material[index]
    if (found === MaterialId.empty) return index
    if (found !== product && found !== MaterialId.source) return -1
  }
  return -1
}

/** A void eats whatever touches it, which is how you drain a world you have filled. */
function consume(grid: Grid, rng: Rng, x: number, y: number): void {
  if (!rng.chance(CONSUME_CHANCE)) return

  const target = pickNeighbour(grid, x, y, isEdible, Math.floor(rng.next() * NEIGHBOURS.length))
  if (target >= 0) transformCell(grid, target, MaterialId.empty)
}

/**
 * A spark runs along anything conductive by swapping places with it, so the wire it travels down
 * survives. Converting the conductor instead would eat the wire behind it. One hop per tick whichever
 * way it goes: without the `moved` guard a spark travelling with the scan was carried along the wire
 * again and again in a single tick, so it ran far faster rightward than leftward.
 */
function conduct(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (grid.moved[index] === 1 || !rng.chance(CONDUCT_CHANCE)) return

  const wire = pickNeighbour(grid, x, y, isConductive, Math.floor(rng.next() * NEIGHBOURS.length))
  if (wire < 0) return

  const conductor = asMaterial(grid.material[wire])
  const charge = grid.data[index]
  const heat = grid.temperature[index]

  grid.material[wire] = MaterialId.spark
  grid.data[wire] = charge
  grid.temperature[wire] = heat
  grid.moved[wire] = 1

  // The wire it just left stays hot behind it, so a current can set light to what it touches.
  transformCell(grid, index, conductor)
  grid.temperature[index] = Math.max(grid.temperature[index], HOT_WIRE)
}

function dissolve(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  // Rotate where the scan starts, or acid would always eat upward first.
  const target = pickNeighbour(grid, x, y, isCorrodible, Math.floor(rng.next() * NEIGHBOURS.length))
  if (target < 0) return

  // Tougher material soaks up more acid before it gives, so stone corrodes slowly and sand melts away.
  const resistance = MATERIALS[grid.material[target]].acidResistance ?? 1
  if (!rng.chance(DISSOLVE_CHANCE * resistance)) return

  transformCell(grid, target, MaterialId.empty)
  grid.data[index] -= 1
  if (grid.data[index] === 0) transformCell(grid, index, MaterialId.empty)
}

/** Chance a shoot forks instead of handing its whole remaining budget to the new tip. */
const BRANCH_CHANCE = 0.25
/** Most a single step can cost a vine's budget. Varying it is what gives tendrils different lengths. */
const MAX_STEP_COST = 3

/**
 * A plant puts out one shoot into adjacent water and hands on what's left of its budget, so growth
 * creeps as a vine with a living tip and stays bounded per painted seed.
 *
 * Each step costs a random slice of the budget and sometimes forks, which is what stops the result
 * being a smooth disc: with a fixed cost and a single tip, every seed ran exactly the same length and
 * the blob ended up suspiciously round.
 */
function grow(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  const budget = grid.data[index]
  if (budget === 0 || !rng.chance(GROWTH_CHANCE)) return

  const target = pickShoot(grid, rng, x, y)
  if (target < 0) return

  transformCell(grid, target, MaterialId.plant)

  const cost = 1 + Math.floor(rng.next() * MAX_STEP_COST)
  const remaining = Math.max(0, budget - cost)

  if (rng.chance(BRANCH_CHANCE)) {
    grid.data[target] = Math.ceil(remaining / 2)
    grid.data[index] = Math.floor(remaining / 2)
    return
  }
  grid.data[target] = remaining
  grid.data[index] = 0
}

/** Chance per tick that a vine cell reaches into touching water. Slower than a plant: it never stops. */
const CREEP_CHANCE = 0.12
/**
 * Most vine a new cell may already be touching, not counting the cell that grew it. Endless growth with
 * no crowding rule just fills a pool solid; refusing to thicken is what keeps it a tangle with holes.
 */
const CROWD_LIMIT = 1

/** Diagonals included, because crowding is about how boxed-in a cell looks, not how it moves. */
const AROUND: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

/**
 * Vine creeps into water forever — no budget, unlike a plant. What stops it becoming a solid green mass
 * is the crowding rule, which is applied to the cell being grown into and counts every vine around it
 * except the one doing the growing. So a tip extends freely, a cell that would close a gap is refused,
 * and the vine spreads as thin, wandering filaments.
 *
 * The test applies to the target only. Testing the grower as well looked right in a test seeded with a
 * single cell and was useless in the game: a brush stroke paints a disc of vine whose every cell is
 * already surrounded by vine, so nothing in it could ever grow and painted vine did nothing at all.
 */
function creep(grid: Grid, rng: Rng, x: number, y: number): void {
  if (!rng.chance(CREEP_CHANCE)) return

  const target = pickShoot(grid, rng, x, y)
  if (target < 0) return

  const tx = target % grid.width
  const ty = (target - tx) / grid.width
  if (crowded(grid, tx, ty, cellIndex(grid, x, y))) return

  transformCell(grid, target, MaterialId.vine)
}

function crowded(grid: Grid, x: number, y: number, ignore: number): boolean {
  let neighbours = 0

  for (const [dx, dy] of AROUND) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (index === ignore || grid.material[index] !== MaterialId.vine) continue

    neighbours++
    if (neighbours > CROWD_LIMIT) return true
  }
  return false
}

/** A weighted-random direction into water, or -1 when the cell has none to grow into. */
function pickShoot(grid: Grid, rng: Rng, x: number, y: number): number {
  const start = Math.floor(rng.next() * SHOOT_BIAS.length)

  for (let step = 0; step < SHOOT_BIAS.length; step++) {
    const [dx, dy] = SHOOT_BIAS[(start + step) % SHOOT_BIAS.length]
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (grid.material[index] === MaterialId.water) return index
  }
  return -1
}

/**
 * Ice creeps into the water it touches, then rests. The cooldown lives in the cell's `data`, which ice
 * has no other use for.
 */
function frost(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (grid.data[index] > 0) {
    grid.data[index] -= 1
    return
  }
  if (!rng.chance(FROST_ON_CONTACT)) return

  const target = pickNeighbour(grid, x, y, isWater, Math.floor(rng.next() * NEIGHBOURS.length))
  if (target < 0) return

  // Placed rather than transformed, so the new ice starts at ice temperature. Inheriting the water's
  // warmth would put it straight back over its own melting point.
  placeMaterial(grid, target, MaterialId.ice)
  grid.data[index] = restTicks(rng)
  grid.data[target] = restTicks(rng)
}

function restTicks(rng: Rng): number {
  return FROST_REST_MIN + Math.floor(rng.next() * FROST_REST_SPREAD)
}

/**
 * Liquid nitrogen boils away from its surface. Exposure is how much of the ring around a cell is not
 * more nitrogen, so the top of a puddle goes first and cells buried in the middle keep themselves cold
 * until the surface has worked its way down to them.
 */
function boilOff(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  let shielded = 0
  for (const [dx, dy] of AROUND) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) {
      shielded++
      continue
    }
    if (grid.material[cellIndex(grid, nx, ny)] === MaterialId.nitrogen) shielded++
  }

  const exposure = (AROUND.length - shielded) / AROUND.length
  if (exposure > 0 && rng.chance(BOIL_OFF_CHANCE * exposure)) {
    transformCell(grid, index, MaterialId.empty)
  }
}

/** First neighbour matching `accepts`, scanning NEIGHBOURS from `startAt`, or -1. */
function pickNeighbour(
  grid: Grid,
  x: number,
  y: number,
  accepts: (material: number) => boolean,
  startAt = 0,
  alsoAccepts: (index: number) => boolean = () => true
): number {
  for (let step = 0; step < NEIGHBOURS.length; step++) {
    const [dx, dy] = NEIGHBOURS[(startAt + step) % NEIGHBOURS.length]
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const index = cellIndex(grid, nx, ny)
    if (accepts(grid.material[index]) && alsoAccepts(index)) return index
  }
  return -1
}
