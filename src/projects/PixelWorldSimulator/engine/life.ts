import { AntHeading, Grid, Life, MaterialBehavior, MaterialId, Medium } from '../pixel-world.types'
import { asMaterial, cellIndex, placeMaterial, swapCells, transformCell } from './grid'
import { push } from './kinetic'
import { ANT_SOFT, MATERIALS } from './materials'
import { NEIGHBOURS, pickNeighbour } from './neighbours'
import { isCellAwake, isRowBandAwake, wakeChunk } from './chunks'
import { Rng } from './rng'

/**
 * Moves a creature and carries its momentum with it. A creature drifts on the air now, so it can hold a
 * velocity entry; without this the entry would strand on the cell it just left and `moveKinetic` would fling
 * whatever swapped in. Safe to touch the velocity map here — the life pass runs before `moveKinetic`, so
 * nothing is walking it.
 */
function relocate(grid: Grid, from: number, to: number): void {
  const fromMotion = grid.velocity.get(from)
  const toMotion = grid.velocity.get(to)
  swapCells(grid, from, to)
  if (toMotion === undefined) grid.velocity.delete(from)
  else grid.velocity.set(from, toMotion)
  if (fromMotion === undefined) grid.velocity.delete(to)
  else grid.velocity.set(to, fromMotion)
}

/** Energy per tick a creature loses outside its own medium. A fish in the air is on a short clock. */
const STRANDED_DRAIN = 3
/** Chance per tick that a stranded creature is dragged downward, so a fish out of water falls back in. */
const STRANDED_FALL = 0.5
/** Chance per tick a stranded creature thrashes sideways. It is dying, not set in concrete. */
const STRUGGLE = 0.35
/** The most energy a cell's `data` byte can hold. */
const MAX_ENERGY = 255
/** Energy a plant keeps however hard it is grazed, so a pasture always has something to grow back from. */
const GRAZE_FLOOR = 24
/** How many neighbours of its own kind a producer tolerates before it stops dividing. */
const CROWDED = 1
/** What a producer spends to put out a new cell. Its own energy came from light, so it is a cost, not a half. */
const SPLIT_COST = 12

/**
 * How often a hunter looks around, and how coarsely. Sight is by far the most expensive thing in the pass:
 * a bird with a range of 18 reads thirteen hundred cells, and a flock of a thousand of them costs more per
 * tick than everything else in the sim put together. Looking every fourth tick, at every second cell, is
 * sixteen times cheaper and still finds anything bigger than a single cell within a few ticks.
 */
const SCAN_CHANCE = 0.25
const SCAN_STEP = 2
/** Close enough to stop looking: it is already next to something worth chasing. */
const CLOSE_ENOUGH = 9

/**
 * Chance per move that a hungry leaper leaps rather than walks. Low: one flinging itself every tick reads as
 * a bouncing ball rather than something stalking, and it has to sit still long enough to be watched.
 */
const JUMP_CHANCE = 0.12
/** Share of a leap's strength that goes sideways. Under half, so a jump clears a wall rather than skidding. */
const LEAP_SPREAD = 0.45

/**
 * Energy below which an ant leaves off tunnelling and heads for the nearest food it can see. Well under its
 * starting energy, so a nest spends most of its time working and only breaks off when it actually needs to.
 */
const ANT_HUNGRY = 120
/**
 * Chance an ant will wall a path with its own food rather than passing the chance up. Low: enough that a
 * colony keeps a crop alive around itself instead of eating a sealed case bare, far short of the leaf farm
 * that building with food at every opportunity turns a nest into.
 */
const FOOD_WALL_CHANCE = 0.7

// Which ids are alive, and their config, as flat lookups: the pass asks this of every cell it visits.
const LIFE = MATERIALS.map((material) => material.life)
const IS_ALIVE = new Uint8Array(MATERIALS.map((material) => (material.life === undefined ? 0 : 1)))
/**
 * Who eats what, as a flat table indexed `species * count + material`. The diet was an array, and
 * `includes` on it ran once per neighbour and once per cell of every hunter's sight.
 */
const EATS = new Uint8Array(MATERIALS.length * MATERIALS.length)
for (const material of MATERIALS) {
  for (const food of material.life?.diet ?? []) EATS[material.id * MATERIALS.length + food] = 1
}

/** Whether this species eats that material. */
function eats(species: number, material: number): boolean {
  return EATS[species * MATERIALS.length + material] === 1
}

/**
 * Creatures are single cells: the species is the `MaterialId` and the energy is the cell's `data` byte.
 * Everything below is the same four rules for every species, with the numbers coming from the material
 * table — move inside your medium, eat what is next to you, split when you are full, die at zero.
 *
 * A food chain falls out of that rather than being written down anywhere: algae lives on light, fish eat
 * algae, birds eat fish, everything dies into meat, and bugs eat the meat.
 */
export function simulateLife(grid: Grid, rng: Rng, tick: number): void {
  const { width, height, material, moved } = grid
  if (grid.heading.size > 0) pruneAntHeadings(grid)
  // The x direction alternates with tick parity, and anything that moves is marked. Without both, a
  // creature that steps into a cell the scan has not reached yet gets a second turn in the same tick, and
  // a crowd of them drifts: a blob of birds slid steadily left across an empty world.
  const leftToRight = tick % 2 === 0

  for (let y = height - 1; y >= 0; y--) {
    if (!isRowBandAwake(grid, y)) continue
    for (let i = 0; i < width; i++) {
      const x = leftToRight ? i : width - 1 - i
      if (!isCellAwake(grid, x, y)) continue
      const index = y * width + x
      const id = material[index]
      if (IS_ALIVE[id] === 0 || moved[index]) continue

      const life = LIFE[id]
      if (life === undefined) continue

      // Everything alive is on a roll every tick — moving, eating, breeding, burning a point of energy —
      // so a creature that did nothing this tick is not a creature that has settled. It keeps its chunk
      // awake for as long as it lives.
      wakeChunk(grid, index)

      // Ants run their own rules: they dig and steer instead of drifting, so they never touch the
      // grazer path below.
      if (id === MaterialId.ant) {
        stepAnt(grid, rng, x, y, index, life)
        continue
      }

      if (!spendEnergy(grid, index, life, rng)) continue
      if (eat(grid, rng, x, y, index, life)) continue
      if (breed(grid, rng, x, y, index, life)) continue

      if (!inMedium(grid, index, life)) {
        strand(grid, rng, x, y, index)
        continue
      }
      if (sink(grid, index, x, y, life)) continue
      // Death is handled where the energy is spent. Checking it here read the cell the creature had
      // just moved out of, so every step turned the water behind it into a corpse.
      if (rng.chance(life.moveChance)) roam(grid, rng, x, y, index, life)
    }
  }
}

/**
 * Runs the cell's metabolism. Algae gains from light instead of spending; everything else spends, and
 * spends much faster somewhere it cannot survive. False when the cell died doing it.
 */
function spendEnergy(grid: Grid, index: number, life: Life, rng: Rng): boolean {
  const stranded = !inMedium(grid, index, life)
  const energy = grid.data[index]

  if (stranded) {
    grid.data[index] = Math.max(0, energy - STRANDED_DRAIN)
  } else if (life.diet.length === 0) {
    if (rng.chance(life.light ?? 0)) grid.data[index] = Math.min(MAX_ENERGY, energy + 1)
  } else if (rng.chance(life.burnRate)) {
    grid.data[index] = energy - 1
  }

  if (grid.data[index] > 0) return true
  transformCell(grid, index, remainsOf(grid, index, life))
  return false
}

/**
 * What a dead cell leaves behind. Whatever its species declares, except that something aquatic dying with no
 * air anywhere near it leaves the water it was standing in rather than a vacuum: eating already works this way
 * (a grazed weed leaves water behind), and death did not, so weed that died submerged left one-cell bubbles
 * of nothing — sealed into the reef where no water could ever reach them, which is exactly the little black
 * specks that turned up along an aquarium's sand line.
 *
 * Air anywhere beside it means it died out of the water, and then it leaves nothing, because there was no
 * water there to leave.
 */
function remainsOf(grid: Grid, index: number, life: Life): MaterialId {
  if (life.corpse !== MaterialId.empty || life.medium !== Medium.water) return life.corpse
  return touches(grid, index, isAir) ? life.corpse : MaterialId.water
}

/**
 * Whether this cell is somewhere its species can live, judged by what is *around* it. A creature stands in
 * the cell it occupies, so the water a fish is swimming in is in its neighbours, never underneath it.
 * Reading the cell's own material instead meant every creature counted as at home and nothing ever
 * drowned.
 */
function inMedium(grid: Grid, index: number, life: Life): boolean {
  const medium = life.medium
  if (medium === Medium.any) return true

  // Scanned inline rather than through a `touches` predicate: this runs for every creature every tick, and
  // a fresh closure per call is allocation the hot loop cannot spare.
  const x = index % grid.width
  const y = Math.floor(index / grid.width)

  if (medium === Medium.surface) {
    if (!standingOnSomething(grid, index)) return false
    // Its own food counts as breathable: a bug that eats its way into a bank of grass tunnels through,
    // grazing, rather than burying itself.
    const species = grid.material[index]
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
      const material = grid.material[cellIndex(grid, nx, ny)]
      if (isAir(material) || LIFE[material]?.medium === medium || eats(species, material))
        return true
    }
    return false
  }

  // Bordering the bare medium counts, and so does bordering anything that itself lives in it: the water a
  // fish swims in is in its neighbours, and a fish packed into a shoal is not stranded. Counting only the
  // bare medium suffocated packed patches from the inside, all at once.
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    const material = grid.material[cellIndex(grid, nx, ny)]
    if (isMedium(medium, material) || LIFE[material]?.medium === medium) return true
  }
  return false
}

/** The bare medium itself: water for water, soil for soil, air otherwise. */
function isMedium(medium: Medium, material: number): boolean {
  if (medium === Medium.water) return isWater(material)
  if (medium === Medium.soil) return isSoil(material)
  return isAir(material)
}

/** Whether any of the four neighbours satisfies `accepts`. */
function touches(grid: Grid, index: number, accepts: (material: number) => boolean): boolean {
  const x = index % grid.width
  const y = Math.floor(index / grid.width)

  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (accepts(grid.material[cellIndex(grid, nx, ny)])) return true
  }
  return false
}

function isCreature(material: number): boolean {
  return IS_ALIVE[material] === 1
}

function isWater(material: number): boolean {
  return material === MaterialId.water || material === MaterialId.saltWater
}

function isAir(material: number): boolean {
  return material === MaterialId.empty
}

function isSoil(material: number): boolean {
  return (
    material === MaterialId.dirt ||
    material === MaterialId.sand ||
    material === MaterialId.mud ||
    material === MaterialId.gravel
  )
}

/** Something firm under the cell below: what makes a bug a walker rather than a floater. */
function standingOnSomething(grid: Grid, index: number): boolean {
  const below = index + grid.width
  if (below >= grid.material.length) return true

  const under = grid.material[below]
  if (under === MaterialId.empty || isCreature(under)) return false
  return MATERIALS[under].behavior !== MaterialBehavior.gas
}

/** Whether a creature of this species can move into a cell. */
function passable(grid: Grid, index: number, life: Life): boolean {
  const target = grid.material[index]
  if (isCreature(target)) return false

  switch (life.medium) {
    case Medium.water:
      return target === MaterialId.water || target === MaterialId.saltWater
    case Medium.air:
      return target === MaterialId.empty
    case Medium.soil:
      return isSoil(target)
    case Medium.surface:
      return target === MaterialId.empty
    case Medium.any:
      return loose(target) || MATERIALS[target].life !== undefined
  }
}

/**
 * Whether a step is allowed to go upward. Only things that live in the air may climb through it: a slime is
 * at home anywhere it can fit, which is not the same as being able to fly, and watching one stroll up
 * through empty space looked absurd.
 */
function canClimb(grid: Grid, target: number, life: Life): boolean {
  if (life.medium === Medium.air) return true
  return grid.material[target] !== MaterialId.empty
}

/**
 * Eats a neighbour if one is on the menu, leaving the eater's own medium behind. Water, for a fish, or a
 * hole in the pool appears every time something has lunch.
 */
function eat(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): boolean {
  if (life.diet.length === 0) return false
  // Full creatures leave the rest for later, and nothing eats faster than its own appetite.
  if (grid.data[index] >= life.breedAt) return false
  if (!rng.chance(life.feedChance)) return false

  const species = grid.material[index]
  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  const meal = pickNeighbour(grid, x, y, (material) => eats(species, material), start)
  if (meal < 0) return false

  // A bite, not a swallow. Living food loses energy and dies only when there is nothing left in it, so a
  // patch of algae is a pasture that grows back rather than a cell that vanishes whole. Eating cells
  // outright turned every grazer into a strip miner: the crop went to zero and then everything starved.
  const prey = LIFE[grid.material[meal]]
  // Living food keeps a reserve: grazing cannot take the last of a plant, which is what stops a pasture
  // being eaten out of existence. Without a floor the crop reaches zero and then everything starves,
  // however carefully the rest is tuned — prey needs somewhere to survive a bad season.
  // The reserve is a plant's, not an animal's: applied to everything, a predator could only nibble prey
  // down to the floor and never finish it, so nothing ever actually killed anything.
  const isPlant = prey !== undefined && prey.diet.length === 0
  const available =
    prey === undefined ? life.nutrition : grid.data[meal] - (isPlant ? GRAZE_FLOOR : 0)
  if (available <= 0) return false

  const taken = Math.min(available, life.nutrition)

  if (prey === undefined) {
    transformCell(grid, meal, life.medium === Medium.water ? MaterialId.water : MaterialId.empty)
  } else {
    grid.data[meal] -= taken
    if (grid.data[meal] === 0) {
      // Leave behind what the prey leaves when it dies of anything else: an aquatic creature walled into the
      // water leaves water, not a sealed air bubble. Reading the eater's medium instead left slime-eaten fish
      // as little pockets of vacuum on the reef.
      transformCell(grid, meal, remainsOf(grid, meal, prey))
    }
  }

  grid.data[index] = Math.min(MAX_ENERGY, grid.data[index] + taken)
  return true
}

/** Splits a full cell in two, half the energy each, into any neighbouring cell it could live in. */
function breed(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): boolean {
  const energy = grid.data[index]
  if (energy < life.breedAt) return false
  if (!rng.chance(life.breedChance)) return false

  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  const room = pickNeighbour(
    grid,
    x,
    y,
    () => true,
    start,
    (candidate) => passable(grid, candidate, life)
  )
  if (room < 0) return false

  // An animal halves what it has, because that energy came from food it ate. A producer pays a fixed cost
  // and keeps the rest, because its energy comes from light: halving it made every split take twice as
  // long as the last, so a patch of algae could never keep pace with anything grazing on it.
  const produces = life.diet.length === 0
  // A producer keeps its patch lacy rather than paving the water: past a couple of neighbours of its own,
  // it stops dividing. A rate alone gives a solid mat, the same way vines needed a crowding rule.
  if (produces && ownNeighbours(grid, x, y) > CROWDED) return false
  const child = produces ? life.startEnergy : Math.floor(energy / 2)
  const kept = produces ? energy - SPLIT_COST : energy - child

  placeMaterial(grid, room, asMaterial(grid.material[index]))
  // A newborn waits for the next tick, like everything else that has already been dealt with.
  grid.moved[room] = 1
  grid.data[room] = child
  grid.data[index] = Math.max(1, kept)
  return true
}

/** Where a burrower prefers to go: upward, so it works the topsoil rather than sinking out of sight. */
const SURFACING: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
]

/**
 * A step through its own medium, biased toward whatever it eats when it can see some. The bias is the
 * whole reason a bird reads as hunting rather than as drifting.
 */
function roam(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): void {
  // Only look for food while there is room for a meal. A full creature scanning its whole range every tick
  // is the most expensive thing in the pass and buys nothing.
  // Looking around is rationed: see SCAN_CHANCE.
  const hungry = grid.data[index] < life.breedAt
  const looks = life.hunts !== undefined && hungry && rng.chance(SCAN_CHANCE)
  const toward = looks ? sightOf(grid, x, y, index, life) : null

  // A hungry leaper throws itself along every so often, toward prey when it can see any and otherwise at
  // random. Ledges, boulders and pits are dead ends to something that can neither fly like a bird nor
  // burrow like a worm, and hopping now and then is what gets it over them — the impulse goes through the
  // kinetic map, so the arc and the landing are the same physics a blast uses.
  if (life.jump !== undefined && hungry && rng.chance(JUMP_CHANCE)) {
    const sideways = toward === null ? (rng.chance(0.5) ? 1 : -1) : toward.dx
    push(grid, index, sideways * life.jump * LEAP_SPREAD, -life.jump)
    grid.moved[index] = 1
    return
  }

  if (toward !== null) {
    const stepped = tryStep(grid, index, x, y, toward.dx, toward.dy, life)
    if (stepped) return
  }

  // A burrower drifts upward on purpose. Left to a plain random walk a worm sinks away from the surface,
  // out of reach of anything that eats worms, and a bank of them starves the birds standing over it.
  const directions = life.medium === Medium.soil ? SURFACING : NEIGHBOURS
  const start = Math.floor(rng.next() * directions.length)
  for (let step = 0; step < directions.length; step++) {
    const [dx, dy] = directions[(start + step) % directions.length]
    if (tryStep(grid, index, x, y, dx, dy, life)) return
  }
}

/** One cell of movement, if the target is somewhere this species can be. */
function tryStep(
  grid: Grid,
  index: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
  life: Life
): boolean {
  const nx = x + dx
  const ny = y + dy
  if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) return false

  const target = cellIndex(grid, nx, ny)
  if (!passable(grid, target, life)) return false
  if (dy < 0 && !canClimb(grid, target, life)) return false

  // A surface walker has to keep something underfoot, or it walks off the edge of its own world.
  if (life.medium === Medium.surface && !standingOnSomething(grid, target)) return false

  relocate(grid, index, target)
  grid.moved[index] = 1
  grid.moved[target] = 1
  return true
}

/** How many of the four neighbours are the same species as this cell. */
function ownNeighbours(grid: Grid, x: number, y: number): number {
  const species = grid.material[cellIndex(grid, x, y)]
  let total = 0

  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (grid.material[cellIndex(grid, nx, ny)] === species) total++
  }
  return total
}

/** The direction of the nearest thing on the menu, or null when nothing is in range. */
function sightOf(
  grid: Grid,
  x: number,
  y: number,
  index: number,
  life: Life
): { dx: number; dy: number } | null {
  const reach = life.hunts ?? 0
  const species = grid.material[index]
  const top = Math.max(0, y - reach)
  const bottom = Math.min(grid.height - 1, y + reach)
  const leftmost = Math.max(0, x - reach)
  const rightmost = Math.min(grid.width - 1, x + reach)

  let best = -1
  let towardX = 0
  let towardY = 0

  // Rows and columns are walked in strides, and the bounds are clamped once rather than tested per cell.
  for (let ny = top; ny <= bottom; ny += SCAN_STEP) {
    const row = ny * grid.width
    for (let nx = leftmost; nx <= rightmost; nx += SCAN_STEP) {
      if (!eats(species, grid.material[row + nx])) continue

      const dx = nx - x
      const dy = ny - y
      const distance = dx * dx + dy * dy
      if (best >= 0 && distance >= best) continue

      best = distance
      towardX = Math.sign(dx)
      towardY = Math.sign(dy)
      // Something this close is worth chasing without reading the rest of the range.
      if (distance <= CLOSE_ENOUGH) return { dx: towardX, dy: towardY }
    }
  }

  return best < 0 ? null : { dx: towardX, dy: towardY }
}

/**
 * Out of its medium a creature falls and thrashes: a fish flapping on dry land drops back toward the water
 * and flops about while it does. Standing perfectly still made a stranded creature read as a solid block
 * rather than as something in trouble.
 */
function strand(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (y + 1 < grid.height && rng.chance(STRANDED_FALL)) {
    const below = cellIndex(grid, x, y + 1)
    if (loose(grid.material[below])) {
      relocate(grid, index, below)
      grid.moved[index] = 1
      grid.moved[below] = 1
      return
    }
  }

  if (!rng.chance(STRUGGLE)) return

  // Sideways through anything loose, not just its own medium: it is trying to get out of where it is.
  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  for (let step = 0; step < NEIGHBOURS.length; step++) {
    const [dx, dy] = NEIGHBOURS[(start + step) % NEIGHBOURS.length]
    if (dy < 0) continue
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const target = cellIndex(grid, nx, ny)
    if (!loose(grid.material[target])) continue
    relocate(grid, index, target)
    grid.moved[index] = 1
    grid.moved[target] = 1
    return
  }
}

/**
 * Pulls anything that cannot fly down through open air. A slime crossing a cave should fall into it, and
 * only a bird gets to hold its height.
 */
function sink(grid: Grid, index: number, x: number, y: number, life: Life): boolean {
  if (life.medium === Medium.air || y + 1 >= grid.height) return false

  const below = cellIndex(grid, x, y + 1)
  if (grid.material[below] !== MaterialId.empty) return false

  relocate(grid, index, below)
  grid.moved[index] = 1
  grid.moved[below] = 1
  return true
}

/** Anything a struggling creature can shove itself through: air, gas, liquid, or loose grains. */
function loose(material: number): boolean {
  if (material === MaterialId.empty) return true
  const behavior = MATERIALS[material].behavior
  return behavior !== MaterialBehavior.static
}

// --- Ants -----------------------------------------------------------------------------------------
// An ant is a builder, not a burrower. It crawls over the surfaces of things, hugging whatever it can
// grip, and lays a trail of vine behind it as it goes, so a nest webs its surroundings with branching
// green paths that go on climbing on their own. Its heading lives in `grid.heading`.

/** The soft stuff an ant bores straight through, so it can work into the middle of a plank, not just its face. */
const BURROWABLE = new Uint8Array(MATERIALS.length)
for (const id of ANT_SOFT) BURROWABLE[id] = 1
/**
 * Chance per move that an ant turns while boring wood. Low, so a gallery holds its heading and runs long —
 * a turn mostly picks another diagonal and now and then a cardinal, mixing the odd flat or upright run in.
 */
const ANT_BRANCH_CHANCE = 0.02
/**
 * Chance per move that an ant turns while walling out in the open. Higher than boring, so a line struck
 * across empty air bends into a shape rather than shooting straight to the edge of the world.
 */
const ANT_TURN_OPEN = 0.05
/**
 * Chance per move an ant walks an existing lane instead of cutting a new one. High, so a few ants do not
 * pave the whole world — they mostly patrol what they have built, and the network grows only on the moves
 * they pass this up.
 */
const REUSE_CHANCE = 0.9

/**
 * Where an ant looks for the surface it is standing on, to lay a trail of the same stuff — below first,
 * then to the sides, then above. An ant on wood draws wood, one on sand draws sand, so it builds lines
 * out of whatever it is walking over rather than always the one material.
 */
const UNDERFOOT: readonly (readonly [number, number])[] = [
  [0, 1],
  [-1, 1],
  [1, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
]

/** The eight steps an ant can take, cardinals and diagonals alike. */
const ANT_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

// Scratch for headingOrder, reused every call so ordering an ant's eight steps allocates nothing in the
// tick loop. Scores are filled per call; the index list is sorted in place and mapped back to the steps.
const HEADING_SCORES = new Float64Array(ANT_STEPS.length)
const HEADING_INDEX = ANT_STEPS.map((_, i) => i)
const HEADING_OUT: (readonly [number, number])[] = ANT_STEPS.map((step) => step)
const byHeadingScore = (a: number, b: number) => HEADING_SCORES[b] - HEADING_SCORES[a]

/**
 * The bearings a turning ant may pick, weighted by how often they come up: the four diagonals dominate,
 * up and down alike, with the straight cardinals a minority, so galleries mostly run on the slant rather
 * than in boxy right angles and a colony spreads through a trunk instead of all draining to its base.
 */
const ANT_TURNS: readonly (readonly [number, number])[] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/**
 * One ant's turn: burn a little energy, graze any leaf within reach, then crawl a step along a surface
 * and, most of the time, leave a length of vine where it just stood. Falling, gripping and trail-laying
 * are its whole character; it never touches the grazer movement rules.
 */
function stepAnt(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): void {
  if (rng.chance(life.burnRate) && grid.data[index] > 0) grid.data[index] -= 1
  if (grid.data[index] === 0) {
    grid.heading.delete(index)
    transformCell(grid, index, life.corpse)
    return
  }

  // Fuel up on a touching leaf, then, rarely, put out another worker where there is room for one.
  if (eat(grid, rng, x, y, index, life)) return
  if (breed(grid, rng, x, y, index, life)) return

  // Gravity, but an ant grips like an ant: it holds on as long as any solid touches it, corners included,
  // and drops only in genuinely open air. So one painted in the sky falls to a surface, while one crawling
  // a wall or its own trail keeps its footing.
  if (
    !clingsToWall(grid, x, y) &&
    y + 1 < grid.height &&
    grid.material[cellIndex(grid, x, y + 1)] === MaterialId.empty
  ) {
    const below = cellIndex(grid, x, y + 1)
    relocate(grid, index, below)
    grid.moved[index] = 1
    grid.moved[below] = 1
    moveHeading(grid, index, below)
    return
  }

  if (!rng.chance(life.moveChance)) return

  let heading = grid.heading.get(index)
  if (heading === undefined) {
    heading = { hx: rng.chance(0.5) ? 1 : -1, hy: rng.chance(0.5) ? 1 : -1 }
    grid.heading.set(index, heading)
  }

  // Running low, it stops working and goes to the larder: the heading swings toward the nearest leaf it can
  // see. A nest that bored on regardless starved with a crop at the other end of its own galleries.
  const starving = grid.data[index] < ANT_HUNGRY
  const smells = starving && life.hunts !== undefined && rng.chance(SCAN_CHANCE)
  const food = smells ? sightOf(grid, x, y, index, life) : null

  if (food !== null) {
    heading.hx = food.dx
    heading.hy = food.dy
  } else {
    // Out in the open, an ant turns far more often than when it is boring wood: a gallery threaded through a
    // trunk wants to run long and straight, but a line drawn across empty air wants to bend into a shape
    // rather than shoot dead to the edge of the world.
    const inOpen = openNeighbours(grid, x, y) >= 4
    if (rng.chance(inOpen ? ANT_TURN_OPEN : ANT_BRANCH_CHANCE)) turn(heading, rng)
  }

  const dirs = headingOrder(heading, rng)

  // Mostly, walk a lane that already exists rather than cut a new one — otherwise a handful of ants pave the
  // whole world in a minute. Reusing costs nothing and builds nothing; only now and then does an ant pass
  // this up and strike out somewhere fresh. A lane is a real corridor — open, walled on both sides across the
  // way ahead, and carrying on for another cell — so an ant does not take the flat face of a log for a path
  // and pace up its edge, which is exactly what a plain "next to a wall" test had them doing.
  if (rng.chance(REUSE_CHANCE)) {
    for (const [dx, dy] of dirs) {
      if (dx === -heading.hx && dy === -heading.hy) continue
      if (!isCorridor(grid, x, y, dx, dy)) continue
      const target = cellIndex(grid, x + dx, y + dy)
      relocate(grid, index, target)
      grid.moved[index] = 1
      grid.moved[target] = 1
      heading.hx = dx
      heading.hy = dy
      moveHeading(grid, index, target)
      return
    }
  }

  // The soft stuff at hand to build walls with. Building is free: charged for, it is by far an ant's largest
  // outgoing — a nest builds ten times faster than it burns energy standing still — so a colony spent
  // everything it grazed on masonry and starved beside a full crop. What bounds the network is `REUSE_CHANCE`,
  // not a toll.
  const wall = softNear(grid, rng, x, y)
  const lay = wall !== MaterialId.empty

  for (const [dx, dy] of dirs) {
    // Never turn straight back the way it came, or an ant reaching the end of a lane just walks it in
    // reverse and paces the same corridor up and down forever. Blocked in front, it extends or turns onto
    // another lane instead.
    if (dx === -heading.hx && dy === -heading.hy) continue

    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    const target = cellIndex(grid, nx, ny)
    const there = grid.material[target]
    const boring = BURROWABLE[there] === 1

    // Eat forward through soft stuff. Into open air only to walk a lane that is already there, or to open a
    // fresh one by laying a wall to each side — never to skirt a single face, which is what had ants pacing
    // up the wood instead of into it. Hard rock, loose ground and creatures it cannot pass.
    if (there !== MaterialId.empty && !boring) continue
    if (
      there === MaterialId.empty &&
      !isLane(grid, x, y, dx, dy) &&
      !(lay && canOpenLane(grid, x, y, dx, dy))
    ) {
      continue
    }

    // Move, carving whatever it steps into so the lane it walks is left open behind it.
    relocate(grid, index, target)
    transformCell(grid, index, MaterialId.empty)
    grid.moved[index] = 1
    grid.moved[target] = 1
    heading.hx = dx
    heading.hy = dy
    moveHeading(grid, index, target)

    // A ridge to either side, square across the heading, and only into open air — so a lane keeps its two
    // walls even once its middle is hollow, and a path never cuts through anything already standing.
    if (lay) {
      wallInto(grid, nx + dy, ny - dx, wall)
      wallInto(grid, nx - dy, ny + dx, wall)
    }
    return
  }
}

/** How many of the eight surrounding cells are open air — a read of how out-in-the-open the ant is. */
function openNeighbours(grid: Grid, x: number, y: number): number {
  let open = 0
  for (const [dx, dy] of ANT_STEPS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (grid.material[cellIndex(grid, nx, ny)] === MaterialId.empty) open++
  }
  return open
}

/** Whether a cell is in bounds and open air. */
function isEmpty(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return false
  return grid.material[cellIndex(grid, x, y)] === MaterialId.empty
}

/** Whether a cell is a solid wall a lane can run between: not open air, a fluid, or a creature. */
function isWallCell(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return false
  const material = grid.material[cellIndex(grid, x, y)]
  if (IS_ALIVE[material] === 1) return false
  const behavior = MATERIALS[material].behavior
  return behavior === MaterialBehavior.static || behavior === MaterialBehavior.powder
}

/**
 * Whether the cell one step on is an open lane: empty, with a wall on each side square across the step. A
 * wall on only one side is the flat face of a log, not a path — the distinction that stops an ant reading a
 * trunk's edge as a corridor and pacing up it.
 */
function isLane(grid: Grid, x: number, y: number, dx: number, dy: number): boolean {
  const tx = x + dx
  const ty = y + dy
  if (!isEmpty(grid, tx, ty)) return false
  return isWallCell(grid, tx + dy, ty - dx) && isWallCell(grid, tx - dy, ty + dx)
}

/** Whether the step opens onto a real corridor: a lane that carries on another cell, not a lone pocket. */
function isCorridor(grid: Grid, x: number, y: number, dx: number, dy: number): boolean {
  return isLane(grid, x, y, dx, dy) && isEmpty(grid, x + 2 * dx, y + 2 * dy)
}

/** Whether the step could open a fresh lane: both flanks of the cell ahead are open air to wall into. */
function canOpenLane(grid: Grid, x: number, y: number, dx: number, dy: number): boolean {
  const tx = x + dx
  const ty = y + dy
  return isEmpty(grid, tx + dy, ty - dx) && isEmpty(grid, tx - dy, ty + dx)
}

/** Places a ridge of `material` at a cell, but only into open air, and reports whether it did. */
function wallInto(grid: Grid, x: number, y: number, material: number): number {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return 0
  const index = cellIndex(grid, x, y)
  if (grid.material[index] !== MaterialId.empty) return 0
  placeMaterial(grid, index, asMaterial(material))
  grid.moved[index] = 1
  return 1
}

/**
 * The material an ant has to hand to wall a path with, looked for underfoot first. Only the stuff it bores
 * counts: a ridge has to be a wall that stays put, so loose ground and open air are no use, which is why an
 * ant crossing bare dirt lays nothing and never grows the ground into a mound.
 *
 * Timber it builds with freely. Its own food only now and then (`FOOD_WALL_CHANCE`), because a wall costs it
 * almost nothing and a cell of leaf can be eaten back for a full meal: at every opportunity a nest feeds
 * itself forever and the greenery runs away with the world, while at none it eats out a sealed case and
 * starves. A trickle is what lets a colony keep a crop alive without farming the place solid.
 */
function softNear(grid: Grid, rng: Rng, x: number, y: number): number {
  const species = grid.material[cellIndex(grid, x, y)]

  for (const [dx, dy] of UNDERFOOT) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    const material = grid.material[cellIndex(grid, nx, ny)]
    if (BURROWABLE[material] !== 1) continue
    if (eats(species, material) && !rng.chance(FOOD_WALL_CHANCE)) continue
    return material
  }
  return MaterialId.empty
}

/**
 * The eight steps ordered so the one nearest the heading comes first. The exact heading gets a bump so an
 * ant holds its line — otherwise a cardinal heading ties with the two diagonals beside it and, with the old
 * fixed tie order leading on a rightward step, every blocked ant drifted right along the flat. The bump
 * keeps a diagonal heading diagonal and a straight one straight, so a change of direction comes from a
 * deliberate turn rather than a wobble; a little rng under the bump settles the remaining ties without bias.
 */
function headingOrder(heading: AntHeading, rng: Rng): readonly (readonly [number, number])[] {
  for (let i = 0; i < ANT_STEPS.length; i++) {
    const step = ANT_STEPS[i]
    const exact = step[0] === heading.hx && step[1] === heading.hy ? 0.4 : 0
    HEADING_SCORES[i] = step[0] * heading.hx + step[1] * heading.hy + exact + rng.next() * 0.3
    HEADING_INDEX[i] = i
  }
  HEADING_INDEX.sort(byHeadingScore)
  for (let i = 0; i < HEADING_INDEX.length; i++) HEADING_OUT[i] = ANT_STEPS[HEADING_INDEX[i]]
  return HEADING_OUT
}

/**
 * Whether any of the eight surrounding cells is firm enough for an ant to grip: a wall or loose ground,
 * but not open air, a fluid, or another creature. Powdered ground counts, or ants set down on bare dirt
 * would have nothing to hold and could not crawl. Other ants are excluded, or a knot of them in mid-air
 * would hold each other up and a cell beside one would always look gripped (an ant is a static cell too).
 */
function clingsToWall(grid: Grid, x: number, y: number): boolean {
  for (const [dx, dy] of ANT_STEPS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    const material = grid.material[cellIndex(grid, nx, ny)]
    if (IS_ALIVE[material] === 1) continue
    const behavior = MATERIALS[material].behavior
    if (behavior === MaterialBehavior.static || behavior === MaterialBehavior.powder) return true
  }
  return false
}

/** Moves an ant's heading with it, if it has one. */
function moveHeading(grid: Grid, from: number, to: number): void {
  const heading = grid.heading.get(from)
  if (heading === undefined) return
  grid.heading.delete(from)
  grid.heading.set(to, heading)
}

/**
 * Picks a new bearing. Diagonals are favoured over the straight cardinals, so a colony fans out into
 * slanting galleries. Never an exact about-face, which would just undig the tunnel it came in on.
 */
function turn(heading: AntHeading, rng: Rng): void {
  const [hx, hy] = ANT_TURNS[Math.floor(rng.next() * ANT_TURNS.length)]
  if (hx === -heading.hx && hy === -heading.hy) return
  heading.hx = hx
  heading.hy = hy
}

/** Drops heading entries whose cell has stopped being an ant, so a burnt or overpainted one leaks none. */
function pruneAntHeadings(grid: Grid): void {
  for (const index of grid.heading.keys()) {
    if (grid.material[index] !== MaterialId.ant) grid.heading.delete(index)
  }
}
